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
import { prefetchCache } from "../utils/prefetchCache.js";
import type { MCQ } from "../schemas/index.js";
import type { AnswerMCQInterrupt } from "../types/interrupts.js";
import { getProgressiveHint } from "../prompts/index.js";

const QUESTIONS_PER_OBJECTIVE = 3;

/**
 * Helper to get session key (must match quizGenerator)
 */
function getSessionKey(learningObjectives: { id: string }[]): string {
  return learningObjectives[0]?.id || "default";
}

/**
 * Resolve prefetched questions if available for the next objective.
 * Returns the prefetched MCQs or empty array if not available/failed.
 */
async function resolvePrefetch(
  sessionKey: string,
  nextObjectiveIdx: number
): Promise<{ mcqs: MCQ[]; objectiveIdx: number } | null> {
  const cached = prefetchCache.get(sessionKey);

  if (!cached || cached.objectiveIdx !== nextObjectiveIdx) {
    return null;
  }

  try {
    logAgentThinking("Feedback", "Awaiting prefetched questions...");
    const mcqs = await cached.promise;
    logAgentSuccess("Feedback", `Prefetch resolved with ${mcqs.length} questions`);
    prefetchCache.delete(sessionKey); // Clean up
    return { mcqs, objectiveIdx: nextObjectiveIdx };
  } catch (error) {
    logAgentError("Feedback", "Prefetch failed, will generate on-demand", {
      error: error instanceof Error ? error.message : String(error),
    });
    prefetchCache.delete(sessionKey); // Clean up failed entry
    return null;
  }
}

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
    attemptCounts,
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
      const nextIdx = currentObjectiveIdx + 1;
      logAgentSuccess(
        "Feedback",
        `Moving to next objective: ${currentObjectiveIdx + 1} -> ${nextIdx + 1}`
      );

      // Resolve prefetch if available
      const sessionKey = getSessionKey(learningObjectives);
      const prefetchResult = await resolvePrefetch(sessionKey, nextIdx);

      logger.endSection();
      return {
        currentObjectiveIdx: nextIdx,
        currentPhase: "quiz", // Will trigger quizGenerator for next objective
        ...(prefetchResult && {
          prefetchedMcqs: prefetchResult.mcqs,
          prefetchObjectiveIdx: prefetchResult.objectiveIdx,
        }),
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
        const nextIdx = currentObjectiveIdx + 1;
        logAgentSuccess(
          "Feedback",
          `Completed objective ${currentObjectiveIdx + 1}, moving to ${nextIdx + 1}`
        );

        // Resolve prefetch if available
        const sessionKey = getSessionKey(learningObjectives);
        const prefetchResult = await resolvePrefetch(sessionKey, nextIdx);

        logger.endSection();
        return {
          currentMcqIdx: currentMcqIdx + 1,
          currentObjectiveIdx: nextIdx,
          ...(prefetchResult && {
            prefetchedMcqs: prefetchResult.mcqs,
            prefetchObjectiveIdx: prefetchResult.objectiveIdx,
          }),
        };
      }
    }

    logger.endSection();
    return {
      currentMcqIdx: currentMcqIdx + 1,
    };
  }

  // Wait for user answer using interrupt - include full MCQ data for feedback
  // Calculate total directly from learningObjectives - more reliable than state field
  const calculatedTotalMcqs = learningObjectives
    ? learningObjectives.length * QUESTIONS_PER_OBJECTIVE
    : 0;

  // Get current attempt count for this question (starts at 1)
  const currentAttemptCount = (attemptCounts[currentMcq.id] || 0) + 1;

  // Generate progressive hint based on attempt count and question context
  // For struggling students, the hint becomes more helpful and contextual
  const dynamicHint = getProgressiveHint(currentMcq.hint, currentAttemptCount, {
    question: currentMcq.question,
    options: currentMcq.options,
    objectiveTitle: learningObjectives?.[currentObjectiveIdx]?.title,
  });

  // Build typed interrupt payload with dynamic hint
  const interruptPayload: AnswerMCQInterrupt = {
    type: "answer_mcq",
    questionId: currentMcq.id,
    objectiveId: currentMcq.objectiveId,
    question: currentMcq.question,
    options: currentMcq.options,
    correctAnswer: currentMcq.correctAnswer,
    hint: dynamicHint, // Use progressive hint based on attempts
    explanation: currentMcq.explanation,
    currentIndex: currentMcqIdx,
    totalQuestions: calculatedTotalMcqs || mcqs.length,
    attemptCount: currentAttemptCount,
  };

  logAgentThinking("Feedback", "Waiting for user answer", {
    questionId: currentMcq.id,
    attemptCount: currentAttemptCount,
    usingProgressiveHint: currentAttemptCount > 1,
  });

  const userInput = interrupt(interruptPayload);

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
        const nextIdx = currentObjectiveIdx + 1;
        logAgentSuccess(
          "Feedback",
          `Completed objective ${currentObjectiveIdx + 1} after correct answer, moving to ${nextIdx + 1}`
        );

        // Resolve prefetch if available
        const sessionKey = getSessionKey(learningObjectives);
        const prefetchResult = await resolvePrefetch(sessionKey, nextIdx);

        logger.endSection();
        return {
          userAnswers: newUserAnswers,
          correctAnswers: correctAnswers + 1,
          currentMcqIdx: currentMcqIdx + 1,
          currentObjectiveIdx: nextIdx,
          ...(prefetchResult && {
            prefetchedMcqs: prefetchResult.mcqs,
            prefetchObjectiveIdx: prefetchResult.objectiveIdx,
          }),
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
    // Incorrect - DON'T store the answer, but increment attempt count
    // The frontend will show hint based on the interrupt data
    logAgentThinking("Feedback", "Incorrect answer, allowing retry", {
      questionId: currentMcq.id,
      attemptCount: currentAttemptCount,
      hint: currentMcq.hint?.substring(0, 50) + "...",
    });
    logger.endSection();

    // Update attempt count for this question
    return {
      attemptCounts: {
        [currentMcq.id]: currentAttemptCount,
      },
    };
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
