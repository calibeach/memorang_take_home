import { interrupt } from "@langchain/langgraph";
import type { LearningState } from "../state.js";
import {
  logger,
  logAgentThinking,
  logAgentDecision,
  logAgentSuccess,
  logAgentError,
} from "../utils/logger.js";
import { NodeResponse } from "../services/index.js";

/**
 * Node that handles quiz interaction - waits for user answers and provides feedback.
 * Uses interrupt to pause for user input.
 *
 * Flow:
 * 1. Show question via interrupt (includes hint, explanation, correctAnswer)
 * 2. User submits answer
 * 3. If correct: store answer, show success feedback via interrupt, then move to next
 * 4. If incorrect: show retry feedback via interrupt (with hint), allow retry
 */
export async function feedbackNode(state: LearningState): Promise<Partial<LearningState>> {
  logger.startSection("Feedback Agent");
  logAgentThinking("Feedback", "Processing quiz interaction...");

  const {
    mcqs,
    currentMcqIdx,
    userAnswers,
    correctAnswers,
    learningObjectives,
    currentObjectiveIdx,
  } = state;

  if (!mcqs || mcqs.length === 0) {
    logAgentError("Feedback", "No questions available");
    logger.endSection();
    return NodeResponse.error("No questions available.");
  }

  const currentMcq = mcqs[currentMcqIdx];
  if (!currentMcq) {
    // All MCQs for current objective completed
    logAgentDecision("Feedback", "All MCQs completed for current objective", {
      currentObjectiveIdx,
      totalObjectives: learningObjectives?.length || 0,
    });

    // Check if we should move to the next objective
    if (learningObjectives && currentObjectiveIdx + 1 < learningObjectives.length) {
      logAgentSuccess(
        "Feedback",
        `Moving to next objective: ${currentObjectiveIdx} -> ${currentObjectiveIdx + 1}`
      );
      logger.endSection();
      return {
        currentObjectiveIdx: currentObjectiveIdx + 1,
        currentPhase: "quiz", // Will trigger quizGenerator for next objective
      };
    }

    logAgentSuccess("Feedback", "All objectives completed, moving to summary");
    logger.endSection();
    return {
      currentPhase: "quiz", // Will trigger summary (all objectives done)
    };
  }

  // Check if we already have a CORRECT answer for this question
  const existingAnswer = userAnswers[currentMcq.id];
  if (existingAnswer !== undefined && existingAnswer === currentMcq.correctAnswer) {
    // Already answered correctly - move on
    logAgentDecision("Feedback", "Question already answered correctly, moving on", {
      questionId: currentMcq.id,
    });

    // Check if this completes the current objective
    const currentObjective = learningObjectives?.[currentObjectiveIdx];
    if (currentObjective) {
      const isLastQuestionOfObjective =
        currentMcqIdx + 1 >= mcqs.length ||
        mcqs[currentMcqIdx + 1]?.objectiveId !== currentObjective.id;

      if (
        isLastQuestionOfObjective &&
        learningObjectives &&
        currentObjectiveIdx + 1 < learningObjectives.length
      ) {
        logAgentSuccess(
          "Feedback",
          `Completed objective ${currentObjectiveIdx}, moving to ${currentObjectiveIdx + 1}`
        );
        logger.endSection();
        return {
          currentMcqIdx: currentMcqIdx + 1,
          currentObjectiveIdx: currentObjectiveIdx + 1,
        };
      }
    }

    logger.endSection();
    return {
      currentMcqIdx: currentMcqIdx + 1,
    };
  }

  // Wait for user answer using interrupt - include full MCQ data for feedback
  const userInput = interrupt({
    type: "answer_mcq",
    questionId: currentMcq.id,
    question: currentMcq.question,
    options: currentMcq.options,
    correctAnswer: currentMcq.correctAnswer,
    hint: currentMcq.hint,
    explanation: currentMcq.explanation,
    currentIndex: currentMcqIdx,
    totalQuestions: mcqs.length,
  });

  // Process the user's answer
  const userAnswer = typeof userInput === "number" ? userInput : parseInt(userInput as string, 10);
  const isCorrect = userAnswer === currentMcq.correctAnswer;

  logAgentDecision("Feedback", `Answer evaluated: ${isCorrect ? "CORRECT" : "INCORRECT"}`, {
    questionId: currentMcq.id,
    userAnswer,
    correctAnswer: currentMcq.correctAnswer,
  });

  if (isCorrect) {
    // Store the correct answer
    const newUserAnswers = {
      ...userAnswers,
      [currentMcq.id]: userAnswer,
    };

    // Check if this completes the current objective
    const currentObjective = learningObjectives?.[currentObjectiveIdx];
    if (currentObjective) {
      const isLastQuestionOfObjective =
        currentMcqIdx + 1 >= mcqs.length ||
        mcqs[currentMcqIdx + 1]?.objectiveId !== currentObjective.id;

      if (
        isLastQuestionOfObjective &&
        learningObjectives &&
        currentObjectiveIdx + 1 < learningObjectives.length
      ) {
        logAgentSuccess(
          "Feedback",
          `Completed objective ${currentObjectiveIdx} after correct answer, moving to ${currentObjectiveIdx + 1}`
        );
        logger.endSection();
        return {
          userAnswers: newUserAnswers,
          correctAnswers: correctAnswers + 1,
          currentMcqIdx: currentMcqIdx + 1,
          currentObjectiveIdx: currentObjectiveIdx + 1,
        };
      }
    }

    // Move to next question
    logAgentSuccess("Feedback", "Correct answer, moving to next question");
    logger.endSection();
    return {
      userAnswers: newUserAnswers,
      correctAnswers: correctAnswers + 1,
      currentMcqIdx: currentMcqIdx + 1,
    };
  } else {
    // Incorrect - DON'T store the answer, allow retry
    // The frontend will show hint based on the interrupt data
    logAgentThinking("Feedback", "Incorrect answer, allowing retry", {
      questionId: currentMcq.id,
      hint: currentMcq.hint?.substring(0, 50) + "...",
    });
    logger.endSection();
    // Return empty update - state stays the same, graph will loop back to feedback
    // and interrupt again for retry
    return {};
  }
}

/**
 * Helper function to check if user should move to next objective
 */
export function shouldMoveToNextObjective(state: LearningState): boolean {
  const { mcqs, currentObjectiveIdx, learningObjectives } = state;

  if (!mcqs || !learningObjectives) return false;

  // Count MCQs for current objective
  const currentObjective = learningObjectives[currentObjectiveIdx];
  if (!currentObjective) return false;

  const objectiveMcqs = mcqs.filter((m) => m.objectiveId === currentObjective.id);
  const answeredMcqs = objectiveMcqs.filter((m) => state.userAnswers[m.id] !== undefined);

  // Check if all MCQs for this objective are answered correctly
  const allCorrect = answeredMcqs.every((m) => state.userAnswers[m.id] === m.correctAnswer);

  return allCorrect && answeredMcqs.length === objectiveMcqs.length;
}
