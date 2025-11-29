/**
 * AI-specific configuration for model settings and content processing limits.
 */
export const AI_CONFIG = {
  model: "gpt-4o-mini", // Default fallback
  models: {
    planning: "gpt-4o-mini",
    quiz: "gpt-4o-mini",
    summary: "gpt-4o-mini",
    critique: "gpt-4o-mini",
    refine: "gpt-4o-mini",
    studyBuddy: "gpt-5-nano",
  },
  temperatures: {
    planning: 0.3,
    quiz: 0.5,
    summary: 0.7,
    critique: 0.3, // Lower temperature for consistent critique
    refine: 0.5, // Moderate temperature for refinement
  },
  truncation: {
    planning: 8000,
    quiz: 6000,
    summary: 2000,
    critique: 6000, // Same as quiz since critiquing quiz content
    refine: 6000, // Same as quiz since refining quiz content
  },
  reflection: {
    /** Whether reflection is enabled */
    enabled: true,
    /** Maximum number of refinement iterations */
    maxIterations: 2,
    /** Clarity score threshold below which refinement is triggered (1-10) */
    critiqueThreshold: 7,
  },
} as const;

export type AIPurpose = keyof typeof AI_CONFIG.temperatures;
