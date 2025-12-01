import { ChatOpenAI } from "@langchain/openai";
import { type RunnableConfig } from "@langchain/core/runnables";
import { AI_CONFIG } from "../../config/ai.config.js";
import {
  CritiqueSchema,
  RefinedMCQBatchSchema,
  type Critique,
  type ReflectionOptions,
  DEFAULT_REFLECTION_OPTIONS,
} from "../../schemas/index.js";
import { BASE_PROMPTS, type PromptContext } from "../../prompts/index.js";
import { logger, logAgentThinking, logAgentSuccess } from "../../utils/logger.js";

/**
 * Result of the reflection process.
 */
export interface ReflectionResult<T> {
  /** The final output (original or refined) */
  output: T;
  /** Whether reflection was performed */
  wasRefined: boolean;
  /** Number of refinement iterations */
  iterations: number;
  /** The critique (if reflection was performed) */
  critique?: Critique;
  /** Summary of refinements made */
  refinementSummary?: string;
}

/**
 * Service for implementing the Reflection pattern.
 * Wraps content generation with self-critique and refinement.
 */
export class ReflectionService {
  /**
   * Critique generated MCQ content.
   *
   * @param content - The MCQ batch content to critique (as JSON string or object)
   * @param context - The prompt context for critique
   * @param config - Optional LangChain RunnableConfig for tracing
   * @returns The critique result
   */
  static async critiqueContent(
    content: unknown,
    context: PromptContext,
    config?: RunnableConfig
  ): Promise<Critique> {
    logAgentThinking("Reflection", "Starting critique phase", {
      purpose: context.purpose,
      objectiveTitle: context.objectiveTitle,
    });

    const model = new ChatOpenAI({
      model: AI_CONFIG.models.critique || AI_CONFIG.model,
      temperature: AI_CONFIG.temperatures.critique,
    });

    const structuredModel = model.withStructuredOutput(CritiqueSchema, {
      name: "critique_mcqs",
    });

    const contentString = typeof content === "string" ? content : JSON.stringify(content, null, 2);

    const critique = await structuredModel.invoke(
      [
        {
          role: "system",
          content: BASE_PROMPTS.critique,
        },
        {
          role: "user",
          content: `Please critique the following MCQ content for the learning objective "${context.objectiveTitle || "unknown"}":

${contentString}

Evaluate for factual accuracy, clarity, educational value, and overall quality.`,
        },
      ],
      config
    );

    logAgentSuccess("Reflection", "Critique completed", {
      hasErrors: critique.hasErrors,
      clarityScore: critique.clarityScore,
      needsRefinement: critique.needsRefinement,
      issueCount: critique.issues.length,
    });

    return critique;
  }

  /**
   * Refine MCQ content based on critique.
   *
   * @param originalContent - The original MCQ batch content
   * @param critique - The critique to address
   * @param context - The prompt context for refinement
   * @param config - Optional LangChain RunnableConfig for tracing
   * @returns The refined MCQ batch
   */
  static async refineContent(
    originalContent: unknown,
    critique: Critique,
    _context: PromptContext,
    config?: RunnableConfig
  ): Promise<{ questions: unknown[]; refinementSummary: string }> {
    logAgentThinking("Reflection", "Starting refinement phase", {
      issueCount: critique.issues.length,
      suggestionCount: critique.suggestions.length,
    });

    const model = new ChatOpenAI({
      model: AI_CONFIG.models.refine || AI_CONFIG.model,
      temperature: AI_CONFIG.temperatures.refine,
    });

    const structuredModel = model.withStructuredOutput(RefinedMCQBatchSchema, {
      name: "refine_mcqs",
    });

    const contentString =
      typeof originalContent === "string"
        ? originalContent
        : JSON.stringify(originalContent, null, 2);

    const refined = await structuredModel.invoke(
      [
        {
          role: "system",
          content: BASE_PROMPTS.refine,
        },
        {
          role: "user",
          content: `Please refine the following MCQ content based on the critique provided.

## Original Content
${contentString}

## Critique
- Issues Found: ${critique.issues.length > 0 ? critique.issues.join("; ") : "None"}
- Suggestions: ${critique.suggestions.length > 0 ? critique.suggestions.join("; ") : "None"}
- Clarity Score: ${critique.clarityScore}/10
- Has Errors: ${critique.hasErrors}
- Educationally Sound: ${critique.isEducationallySound}

Please address all issues and implement the suggestions while maintaining the educational intent.`,
        },
      ],
      config
    );

    logAgentSuccess("Reflection", "Refinement completed", {
      refinementSummary: refined.refinementSummary,
    });

    return refined;
  }

  /**
   * Apply reflection pattern to MCQ generation.
   * Generates content, critiques it, and refines if needed.
   *
   * @param generateFn - The function that generates the initial content
   * @param context - The prompt context
   * @param options - Reflection options (uses defaults if not provided)
   * @param config - Optional LangChain RunnableConfig for tracing
   * @returns The reflection result with final output
   */
  static async withReflection<T extends { questions: unknown[] }>(
    generateFn: () => Promise<T>,
    context: PromptContext,
    options: Partial<ReflectionOptions> = {},
    config?: RunnableConfig
  ): Promise<ReflectionResult<T>> {
    const opts: ReflectionOptions = {
      ...DEFAULT_REFLECTION_OPTIONS,
      ...options,
    };

    // If reflection is disabled, just run the generator
    if (!opts.enabled) {
      logAgentThinking("Reflection", "Reflection disabled, skipping");
      const output = await generateFn();
      return {
        output,
        wasRefined: false,
        iterations: 0,
      };
    }

    logger.startSection("Reflection Pattern");
    logAgentThinking("Reflection", "Starting reflection-enhanced generation", {
      maxIterations: opts.maxIterations,
      critiqueThreshold: opts.critiqueThreshold,
    });

    // Step 1: Generate initial content
    let currentOutput = await generateFn();
    let iterations = 0;
    let lastCritique: Critique | undefined;
    let refinementSummary: string | undefined;

    // Step 2: Critique and refine loop
    while (iterations < opts.maxIterations) {
      iterations++;

      // Critique the current output
      const critique = await this.critiqueContent(currentOutput, context, config);
      lastCritique = critique;

      // Check if refinement is needed
      const needsRefinement =
        critique.needsRefinement ||
        critique.hasErrors ||
        critique.clarityScore < opts.critiqueThreshold;

      if (!needsRefinement) {
        logAgentSuccess("Reflection", "Content passed critique, no refinement needed", {
          iteration: iterations,
          clarityScore: critique.clarityScore,
        });
        break;
      }

      logAgentThinking("Reflection", `Refinement needed (iteration ${iterations})`, {
        reason: critique.needsRefinement
          ? "Critique recommended refinement"
          : critique.hasErrors
            ? "Errors found"
            : `Clarity score ${critique.clarityScore} below threshold ${opts.critiqueThreshold}`,
      });

      // Refine the content
      const refined = await this.refineContent(currentOutput, critique, context, config);
      refinementSummary = refined.refinementSummary;

      // Update output with refined questions while preserving structure
      currentOutput = {
        ...currentOutput,
        questions: refined.questions,
      } as T;
    }

    const wasRefined = iterations > 0 && refinementSummary !== undefined;

    logger.endSection();
    logAgentSuccess("Reflection", "Reflection pattern completed", {
      wasRefined,
      totalIterations: iterations,
      finalClarityScore: lastCritique?.clarityScore,
    });

    return {
      output: currentOutput,
      wasRefined,
      iterations,
      critique: lastCritique,
      refinementSummary,
    };
  }
}
