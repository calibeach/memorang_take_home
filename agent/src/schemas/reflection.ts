import { z } from "zod";

/**
 * Schema for MCQ quality critique.
 * Used by the reflection pattern to evaluate generated MCQs.
 */
export const CritiqueSchema = z.object({
  hasErrors: z.boolean().describe("Does the content have any factual errors or logical flaws?"),
  isEducationallySound: z
    .boolean()
    .describe("Is the content pedagogically appropriate and effective for learning?"),
  clarityScore: z
    .number()
    .min(1)
    .max(10)
    .describe("Clarity rating from 1-10 (10 = perfectly clear)"),
  issues: z.array(z.string()).describe("Specific issues found in the content (empty if none)"),
  suggestions: z
    .array(z.string())
    .describe("Actionable suggestions for improvement (empty if none needed)"),
  needsRefinement: z.boolean().describe("Should the content be refined based on this critique?"),
});

export type Critique = z.infer<typeof CritiqueSchema>;

/**
 * Schema for a single refined MCQ.
 * Extends the base MCQ structure but without id/objectiveId (those are added later).
 */
export const RefinedMCQSchema = z.object({
  question: z.string().describe("The refined question text"),
  options: z.array(z.string()).length(4).describe("Exactly 4 refined answer options"),
  correctAnswer: z.number().min(0).max(3).describe("Index of the correct answer (0-3)"),
  hint: z.string().describe("An improved hint that helps without revealing the answer"),
  explanation: z.string().describe("A clearer explanation of why the correct answer is correct"),
});

export type RefinedMCQ = z.infer<typeof RefinedMCQSchema>;

/**
 * Schema for a batch of refined MCQs.
 * Used after critique to generate improved versions.
 */
export const RefinedMCQBatchSchema = z.object({
  questions: z.array(RefinedMCQSchema).min(2).max(5).describe("2-5 refined questions"),
  refinementSummary: z
    .string()
    .describe("Brief summary of what was improved based on the critique"),
});

export type RefinedMCQBatch = z.infer<typeof RefinedMCQBatchSchema>;

/**
 * Options for controlling reflection behavior.
 */
export interface ReflectionOptions {
  /** Whether reflection is enabled (default: true) */
  enabled: boolean;
  /** Maximum number of refinement iterations (default: 2) */
  maxIterations: number;
  /** Clarity score threshold below which refinement is triggered (default: 7) */
  critiqueThreshold: number;
}

/**
 * Default reflection options.
 */
export const DEFAULT_REFLECTION_OPTIONS: ReflectionOptions = {
  enabled: true,
  maxIterations: 2,
  critiqueThreshold: 7,
};
