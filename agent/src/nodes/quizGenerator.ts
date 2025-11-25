import { MCQBatchSchema, type MCQ } from "../schemas/index.js";
import type { LearningState } from "../state.js";
import {
  logger,
  logAgentThinking,
  logAgentDecision,
  logAgentSuccess,
  logAgentError,
} from "../utils/logger.js";
import { AIModelFactory, ContentProcessor, NodeResponse } from "../services/index.js";

/**
 * Node that generates MCQs for the current learning objective.
 * Creates 3 questions per objective with hints and explanations.
 */
export async function quizGeneratorNode(state: LearningState): Promise<Partial<LearningState>> {
  logger.startSection("Quiz Generator Agent");

  const { pdfContent, learningObjectives, currentObjectiveIdx, mcqs: existingMcqs } = state;

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
  });

  try {
    logAgentThinking("Quiz Generator", "Initializing AI model for MCQ generation", {
      model: "gpt-4o-mini",
      temperature: 0.5,
      questionsPerObjective: 3,
    });

    // Use AIModelFactory for structured output
    const structuredModel = AIModelFactory.createStructured(
      "quiz",
      MCQBatchSchema,
      "generate_mcqs"
    );

    // Use ContentProcessor for truncation
    const { content: truncatedContent } = ContentProcessor.truncate(
      pdfContent,
      "quiz",
      "Quiz Generator"
    );

    logAgentThinking("Quiz Generator", "Designing quiz questions strategy");
    logger.indent();
    logger.think("Quiz Generator", "Creating questions that test comprehension, not memorization");
    logger.think("Quiz Generator", "Ensuring distractors are plausible but incorrect");
    logger.think("Quiz Generator", "Formulating hints that guide without revealing answers");
    logger.think("Quiz Generator", "Writing explanations that teach the concept");
    logger.outdent();

    logger.info("Quiz Generator", "Requesting MCQ generation from AI model");

    const mcqBatch = await structuredModel.invoke([
      {
        role: "system",
        content: `You are an expert quiz creator. Generate multiple choice questions to test understanding of a specific learning objective.

Requirements:
1. Create exactly 3 questions for the given objective
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

Generate 3 multiple choice questions for this learning objective:
Title: ${currentObjective.title}
Description: ${currentObjective.description}
Difficulty: ${currentObjective.difficulty}
Objective ID: ${currentObjective.id}`,
      },
    ]);

    logAgentSuccess("Quiz Generator", "AI model returned MCQ batch");

    // Validate and ensure IDs
    logAgentThinking("Quiz Generator", "Processing and validating generated questions");

    const questionsWithIds: MCQ[] = mcqBatch.questions.map(
      (q: Omit<MCQ, "id" | "objectiveId">, idx: number) => ({
        ...q,
        id: `${currentObjective.id}-q${idx + 1}`,
        objectiveId: currentObjective.id,
      })
    );

    // Validate that each question has correct answer in valid range
    logger.indent();
    for (let i = 0; i < questionsWithIds.length; i++) {
      const q = questionsWithIds[i];

      logAgentThinking(
        "Quiz Generator",
        `Validating question ${i + 1}: "${q.question.substring(0, 50)}..."`,
        {
          optionsCount: q.options.length,
          correctAnswer: q.correctAnswer,
        }
      );

      if (q.correctAnswer < 0 || q.correctAnswer > 3) {
        logAgentDecision("Quiz Generator", `Fixing invalid correct answer index`, {
          originalIndex: q.correctAnswer,
          fixedIndex: 0,
        });
        q.correctAnswer = 0;
      }
      if (q.options.length !== 4) {
        logger.warning("Quiz Generator", `Invalid options count`, {
          expected: 4,
          actual: q.options.length,
        });
      }
    }
    logger.outdent();

    logAgentSuccess("Quiz Generator", `Generated ${questionsWithIds.length} valid MCQs`, {
      objectiveTitle: currentObjective.title,
      questionIds: questionsWithIds.map((q: MCQ) => q.id),
      totalMcqsNow: (existingMcqs?.length || 0) + questionsWithIds.length,
    });

    logger.endSection();

    return {
      mcqs: [...(existingMcqs || []), ...questionsWithIds],
      currentMcqIdx: existingMcqs?.length || 0,
      currentPhase: "quiz",
      error: null,
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
