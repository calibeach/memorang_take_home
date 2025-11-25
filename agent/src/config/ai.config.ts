/**
 * AI-specific configuration for model settings and content processing limits.
 */
export const AI_CONFIG = {
  model: "gpt-4o-mini",
  temperatures: {
    planning: 0.3,
    quiz: 0.5,
    summary: 0.7,
  },
  truncation: {
    planning: 8000,
    quiz: 6000,
    summary: 2000,
  },
} as const;

export type AIPurpose = keyof typeof AI_CONFIG.temperatures;
