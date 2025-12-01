import { LearningPlanSchema, type LearningObjective } from "../schemas/index.js";
import { type RunnableConfig } from "@langchain/core/runnables";
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
 * Node that analyzes PDF content and generates a learning plan.
 * Uses structured output to ensure consistent plan format.
 */
export async function plannerNode(
  state: LearningState,
  config?: RunnableConfig
): Promise<Partial<LearningState>> {
  logger.startSection("Learning Plan Generator Agent");

  const { pdfContent } = state;

  logAgentThinking("Planner", "Checking for PDF content availability");

  if (!pdfContent) {
    logAgentError("Planner", "No PDF content found in state");
    logger.endSection();
    return NodeResponse.error("No PDF content available. Please upload a PDF first.");
  }

  logAgentThinking("Planner", "PDF content available, analyzing document structure", {
    contentLength: pdfContent.length,
    estimatedWords: Math.round(pdfContent.split(" ").length),
  });

  try {
    logAgentThinking("Planner", "Initializing AI model for content analysis", {
      model: "gpt-4o-mini",
      temperature: 0.3,
      purpose: "structured educational content extraction",
    });

    // Use AIModelFactory for structured output
    const structuredModel = AIModelFactory.createStructured(
      "planning",
      LearningPlanSchema,
      "generate_learning_plan"
    );

    // Use ContentProcessor for truncation
    const { content: truncatedContent } = ContentProcessor.truncate(
      pdfContent,
      "planning",
      "Planner"
    );

    logAgentThinking("Planner", "Analyzing content to identify key learning concepts");
    logger.indent();
    logger.think("Planner", "Looking for main topics and themes");
    logger.think("Planner", "Identifying prerequisite knowledge requirements");
    logger.think("Planner", "Assessing complexity levels for different sections");
    logger.think("Planner", "Determining logical progression of concepts");
    logger.outdent();

    logger.info("Planner", "Sending content to AI model for learning plan generation");

    const plan = await structuredModel.invoke(
      [
        {
          role: "system",
          content: `You are an expert educational content designer. Analyze the provided document and create a structured learning plan.

Your task:
1. Identify 3-5 key learning objectives from the content
2. Each objective should be specific and testable
3. Assign appropriate difficulty levels
4. Estimate total learning duration

Guidelines:
- Objectives should build upon each other logically
- Cover the most important concepts in the document
- Make objectives clear and achievable
- Each objective should be distinct (no overlap)`,
        },
        {
          role: "user",
          content: `Please analyze this document and create a learning plan:\n\n${truncatedContent}`,
        },
      ],
      config
    );

    logAgentSuccess("Planner", "AI model returned structured learning plan", {
      objectiveCount: plan.objectives.length,
    });

    // Add IDs to objectives
    logAgentThinking("Planner", "Processing and enhancing learning objectives");

    const objectivesWithIds: LearningObjective[] = plan.objectives.map(
      (obj: Omit<LearningObjective, "id">, idx: number) => ({
        ...obj,
        id: `obj-${idx + 1}`,
      })
    );

    logger.indent();
    objectivesWithIds.forEach((obj: LearningObjective, idx: number) => {
      logAgentDecision("Planner", `Objective ${idx + 1}: ${obj.title}`, {
        difficulty: obj.difficulty,
        description:
          obj.description.substring(0, 100) + (obj.description.length > 100 ? "..." : ""),
      });
    });
    logger.outdent();

    logAgentSuccess(
      "Planner",
      `Learning plan generated with ${objectivesWithIds.length} objectives`,
      {
        estimatedDuration: plan.estimatedDuration,
        difficulties: objectivesWithIds.map((o: LearningObjective) => o.difficulty),
        readyForApproval: true,
      }
    );

    logger.endSection();

    return {
      learningObjectives: objectivesWithIds,
      currentPhase: "approval",
      error: null,
    };
  } catch (err) {
    const errorMessage = NodeResponse.extractErrorMessage(err);
    logAgentError("Planner", "Failed to generate learning plan", {
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
    });
    logger.endSection();
    return NodeResponse.error(`Failed to generate learning plan: ${errorMessage}`);
  }
}
