import { MCQBatchSchema, type MCQ, type LearningObjective } from "../schemas/index.js";
import type { LearningState } from "../state.js";
import {
  logger,
  logAgentThinking,
  logAgentDecision,
  logAgentSuccess,
  logAgentError,
} from "../utils/logger.js";
import { AIModelFactory, ContentProcessor, NodeResponse } from "../services/index.js";
import { prefetchCache } from "../utils/prefetchCache.js";

const QUESTIONS_PER_OBJECTIVE = 3;

/**
 * Helper function to generate MCQs for a specific objective.
 * Extracted to enable reuse for prefetching.
 */
async function generateQuestionsForObjective(
  objective: LearningObjective,
  pdfContent: string,
  agentLabel: string = "Quiz Generator"
): Promise<MCQ[]> {
  const structuredModel = AIModelFactory.createStructured("quiz", MCQBatchSchema, "generate_mcqs");

  const { content: truncatedContent } = ContentProcessor.truncate(pdfContent, "quiz", agentLabel);

  const mcqBatch = await structuredModel.invoke([
    {
      role: "system",
      content: `You are an expert quiz creator. Generate multiple choice questions to test understanding of a specific learning objective.

Requirements:
1. Create exactly ${QUESTIONS_PER_OBJECTIVE} questions for the given objective
2. Each question must have exactly 4 options (A, B, C, D)
3. Only ONE option should be correct
4. Options should be plausible (no obviously wrong answers)
5. Provide a helpful hint that guides without revealing the answer
6. Provide a clear explanation of why the correct answer is right

Guidelines for good MCQs:
- Questions should directly test the learning objective
- Avoid "all of the above" or "none of the above"
- Keep questions clear and unambiguous
- Hints should encourage critical thinking
- Explanations should teach, not just state the answer`,
    },
    {
      role: "user",
      content: `Based on this document content:
---
${truncatedContent}
---

Generate ${QUESTIONS_PER_OBJECTIVE} multiple choice questions for this learning objective:
Title: ${objective.title}
Description: ${objective.description}
Difficulty: ${objective.difficulty}
Objective ID: ${objective.id}`,
    },
  ]);

  // Add IDs to questions
  const questionsWithIds: MCQ[] = mcqBatch.questions.map(
    (q: Omit<MCQ, "id" | "objectiveId">, idx: number) => ({
      ...q,
      id: `${objective.id}-q${idx + 1}`,
      objectiveId: objective.id,
    })
  );

  // Validate correct answers
  for (const q of questionsWithIds) {
    if (q.correctAnswer < 0 || q.correctAnswer > 3) {
      q.correctAnswer = 0;
    }
  }

  return questionsWithIds;
}

/**
 * Get a unique session key for prefetch caching.
 * Uses the first learning objective's ID as it's unique per session.
 */
function getSessionKey(learningObjectives: LearningObjective[]): string {
  return learningObjectives[0]?.id || "default";
}

/**
 * Node that generates MCQs for the current learning objective.
 * Creates 3 questions per objective with hints and explanations.
 * Also prefetches the next objective's questions in the background.
 */
export async function quizGeneratorNode(state: LearningState): Promise<Partial<LearningState>> {
  logger.startSection("Quiz Generator Agent");

  const {
    pdfContent,
    learningObjectives,
    currentObjectiveIdx,
    mcqs: existingMcqs,
    prefetchedMcqs,
    prefetchObjectiveIdx,
  } = state;

  logAgentThinking("Quiz Generator", "Checking learning objectives availability");

  if (!learningObjectives || learningObjectives.length === 0) {
    logAgentError("Quiz Generator", "No learning objectives found in state");
    logger.endSection();
    return NodeResponse.error("No learning objectives available. Please start over.");
  }

  const currentObjective = learningObjectives[currentObjectiveIdx];

  logAgentThinking("Quiz Generator", "Determining current objective", {
    totalObjectives: learningObjectives.length,
    currentIndex: currentObjectiveIdx,
    objectiveFound: !!currentObjective,
  });

  if (!currentObjective) {
    // All objectives completed - move to summary
    logAgentDecision("Quiz Generator", "All objectives have been completed", {
      totalObjectivesProcessed: learningObjectives.length,
      nextPhase: "summary",
    });
    logger.endSection();
    return {
      currentPhase: "summary",
    };
  }

  logAgentThinking("Quiz Generator", `Processing objective: ${currentObjective.title}`, {
    objectiveId: currentObjective.id,
    difficulty: currentObjective.difficulty,
    existingMcqs: existingMcqs?.length || 0,
    hasPrefetch: prefetchObjectiveIdx === currentObjectiveIdx && prefetchedMcqs.length > 0,
  });

  // Calculate total expected MCQs upfront
  const totalExpectedMcqs = learningObjectives.length * QUESTIONS_PER_OBJECTIVE;

  try {
    let questionsForCurrent: MCQ[];

    // Check if we have prefetched questions for this objective
    if (prefetchObjectiveIdx === currentObjectiveIdx && prefetchedMcqs.length > 0) {
      logAgentSuccess("Quiz Generator", "Using prefetched questions (instant!)", {
        objectiveIdx: currentObjectiveIdx,
        questionCount: prefetchedMcqs.length,
      });
      questionsForCurrent = prefetchedMcqs;
    } else {
      // Generate questions normally
      logAgentThinking("Quiz Generator", "Generating questions (no prefetch available)", {
        model: "gpt-4o-mini",
        questionsPerObjective: QUESTIONS_PER_OBJECTIVE,
      });

      questionsForCurrent = await generateQuestionsForObjective(
        currentObjective,
        pdfContent,
        "Quiz Generator"
      );

      logAgentSuccess("Quiz Generator", `Generated ${questionsForCurrent.length} MCQs`);
    }

    // Fire prefetch for NEXT objective (fire-and-forget)
    const nextIdx = currentObjectiveIdx + 1;
    if (nextIdx < learningObjectives.length) {
      const nextObjective = learningObjectives[nextIdx];
      const sessionKey = getSessionKey(learningObjectives);

      logAgentThinking("Quiz Generator", "Starting background prefetch for next objective", {
        nextObjectiveIdx: nextIdx,
        nextObjectiveTitle: nextObjective.title,
      });

      // Start prefetch but don't await - let it run in background
      const prefetchPromise = generateQuestionsForObjective(
        nextObjective,
        pdfContent,
        "Quiz Generator (Prefetch)"
      );

      // Store promise in cache for feedback node to await later
      prefetchCache.set(sessionKey, {
        promise: prefetchPromise,
        objectiveIdx: nextIdx,
      });
    }

    logAgentSuccess("Quiz Generator", `Ready with ${questionsForCurrent.length} MCQs`, {
      objectiveTitle: currentObjective.title,
      questionIds: questionsForCurrent.map((q: MCQ) => q.id),
      totalMcqsNow: (existingMcqs?.length || 0) + questionsForCurrent.length,
      totalExpected: totalExpectedMcqs,
    });

    logger.endSection();

    return {
      mcqs: [...(existingMcqs || []), ...questionsForCurrent],
      currentMcqIdx: existingMcqs?.length || 0,
      totalExpectedMcqs,
      currentPhase: "quiz",
      error: null,
      // Clear prefetch state since we used it (or didn't have any)
      prefetchedMcqs: [],
      prefetchObjectiveIdx: -1,
    };
  } catch (err) {
    const errorMessage = NodeResponse.extractErrorMessage(err);
    logAgentError("Quiz Generator", "Failed to generate MCQs", {
      error: errorMessage,
      objective: currentObjective.title,
      stack: err instanceof Error ? err.stack : undefined,
    });
    logger.endSection();
    return NodeResponse.error(`Failed to generate questions: ${errorMessage}`);
  }
}
