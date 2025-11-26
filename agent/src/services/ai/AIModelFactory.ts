import { ChatOpenAI } from "@langchain/openai";
import { AI_CONFIG, type AIPurpose } from "../../config/ai.config.js";
import { buildSystemPrompt, type PromptContext } from "../../prompts/index.js";
import type { ReflectionOptions } from "../../schemas/index.js";

/**
 * Factory for creating ChatOpenAI model instances with purpose-specific configuration.
 */
export class AIModelFactory {
  /**
   * Create a ChatOpenAI instance configured for a specific purpose.
   * @param purpose - The intended use case (planning, quiz, or summary)
   * @returns A configured ChatOpenAI instance
   */
  static create(purpose: AIPurpose): ChatOpenAI {
    return new ChatOpenAI({
      model: AI_CONFIG.model,
      temperature: AI_CONFIG.temperatures[purpose],
    });
  }

  /**
   * Create a ChatOpenAI instance with structured output support.
   * @param purpose - The intended use case
   * @param schema - The Zod schema for structured output
   * @param name - The name for the structured output function
   * @returns A model configured for structured output
   */
  static createStructured<T>(purpose: AIPurpose, schema: import("zod").ZodType<T>, name: string) {
    const model = this.create(purpose);
    return model.withStructuredOutput(schema, { name });
  }

  /**
   * Build a dynamic system prompt based on context.
   * Wraps the prompts module for convenience.
   * @param context - The prompt context
   * @returns The dynamic system prompt
   */
  static buildPrompt(context: PromptContext): string {
    return buildSystemPrompt(context);
  }

  /**
   * Get the current reflection configuration.
   * @returns The reflection options from AI_CONFIG
   */
  static getReflectionOptions(): ReflectionOptions {
    return {
      enabled: AI_CONFIG.reflection.enabled,
      maxIterations: AI_CONFIG.reflection.maxIterations,
      critiqueThreshold: AI_CONFIG.reflection.critiqueThreshold,
    };
  }
}
