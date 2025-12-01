import { MCQBatchSchema, type MCQ, type LearningObjective } from "../schemas/index.js";
import { type RunnableConfig } from "@langchain/core/runnables";
import type { LearningState } from "../state.js";
import {
  logger,
  logAgentThinking,
  logAgentDecision,
  logAgentSuccess,
  logAgentError,
} from "../utils/logger.js";
import {
  AIModelFactory,
  ContentProcessor,
  NodeResponse,
  ReflectionService,
} from "../services/index.js";
import { prefetchCache } from "../utils/prefetchCache.js";
import { buildSystemPrompt, type PromptContext } from "../prompts/index.js";

const QUESTIONS_PER_OBJECTIVE = 3;

/**
 * Map objective difficulty to prompt context difficulty.
 */
function mapDifficulty(
  difficulty: "easy" | "medium" | "hard"
): "beginner" | "intermediate" | "advanced" {
  switch (difficulty) {
    case "easy":
      return "beginner";
    case "medium":
      return "intermediate";
    case "hard":
      return "advanced";
  }
}

/**
 * Type for the raw MCQ batch (before IDs are added).
 */
interface RawMCQBatch {
  questions: Omit<MCQ, "id" | "objectiveId">[];
}

/**
 * Raw MCQ generation (without reflection).
 * Used internally and for building the generate function for reflection.
 */
async function generateRawMCQs(
  objective: LearningObjective,
  pdfContent: string,
  promptContext: PromptContext,
  agentLabel: string,
  config?: RunnableConfig
): Promise<RawMCQBatch> {
  const structuredModel = AIModelFactory.createStructured("quiz", MCQBatchSchema, "generate_mcqs");
  const { content: truncatedContent } = ContentProcessor.truncate(pdfContent, "quiz", agentLabel);

  // Build dynamic system prompt
  const systemPrompt = buildSystemPrompt(promptContext);

  const mcqBatch = await structuredModel.invoke(
    [
      {
        role: "system",
        content: systemPrompt,
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
    ],
    config
  );

  // Type assertion: the structured model returns data matching our schema
  return mcqBatch as RawMCQBatch;
}

/**
 * Add IDs and validate MCQs.
 */
function finalizeQuestions(
  questions: Omit<MCQ, "id" | "objectiveId">[],
  objective: LearningObjective
): MCQ[] {
  const questionsWithIds: MCQ[] = questions.map(
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
 * Helper function to generate MCQs for a specific objective.
 * Uses reflection pattern to critique and refine generated questions.
 * Extracted to enable reuse for prefetching.
 */
async function generateQuestionsForObjective(
  objective: LearningObjective,
  pdfContent: string,
  agentLabel: string = "Quiz Generator",
  useReflection: boolean = true,
  config?: RunnableConfig
): Promise<MCQ[]> {
  // Build prompt context for this objective
  const promptContext: PromptContext = {
    purpose: "quiz",
    objectiveDifficulty: mapDifficulty(objective.difficulty),
    objectiveTitle: objective.title,
    questionsPerObjective: QUESTIONS_PER_OBJECTIVE,
  };

  // Get reflection options
  const reflectionOptions = AIModelFactory.getReflectionOptions();
  const shouldReflect = useReflection && reflectionOptions.enabled;

  if (shouldReflect) {
    logAgentThinking(agentLabel, "Using reflection pattern for MCQ generation");

    // Wrap generation with reflection
    const reflectionResult = await ReflectionService.withReflection(
      () => generateRawMCQs(objective, pdfContent, promptContext, agentLabel, config),
      promptContext,
      reflectionOptions,
      config
    );

    logAgentSuccess(agentLabel, "Reflection completed", {
      wasRefined: reflectionResult.wasRefined,
      iterations: reflectionResult.iterations,
      clarityScore: reflectionResult.critique?.clarityScore,
    });

    // Finalize with IDs and validation
    return finalizeQuestions(
      reflectionResult.output.questions as Omit<MCQ, "id" | "objectiveId">[],
      objective
    );
  } else {
    // Generate without reflection
    const mcqBatch = await generateRawMCQs(
      objective,
      pdfContent,
      promptContext,
      agentLabel,
      config
    );
    return finalizeQuestions(mcqBatch.questions, objective);
  }
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
export async function quizGeneratorNode(
  state: LearningState,
  config?: RunnableConfig
): Promise<Partial<LearningState>> {
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
        "Quiz Generator",
        true,
        config
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
      // Note: LangSmith tracing errors may occur for prefetch due to async context issues,
      // but this doesn't affect functionality.
      const prefetchPromise = generateQuestionsForObjective(
        nextObjective,
        pdfContent,
        "Quiz Generator (Prefetch)",
        true,
        undefined
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
