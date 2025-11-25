/**
 * Central configuration for the agent backend
 */

import { config as loadEnv } from "dotenv";

// Load environment variables
loadEnv();

export const CONFIG = {
  // Server configuration
  PORT: parseInt(process.env.PORT || "8000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",

  // File handling
  UPLOAD: {
    DIR: "../uploads",
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_MIME_TYPES: ["application/pdf"],
    FILE_PREFIX: "pdf",
  },

  // PDF processing
  PDF: {
    MIN_WORD_COUNT: 50,
    MAX_CONTENT_LENGTH: 50000, // Characters for AI processing
    SUMMARY_LENGTH: 2000, // Characters for summary
  },

  // CORS configuration
  CORS: {
    ORIGINS: process.env.CORS_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    CREDENTIALS: true,
  },

  // AI configuration
  AI: {
    MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
    TEMPERATURE: 0.7,
    PLANNING_TEMPERATURE: 0.6,
    MAX_RETRIES: 3,
    TIMEOUT_MS: 30000, // 30 seconds
  },

  // Learning configuration
  LEARNING: {
    MIN_OBJECTIVES: 3,
    MAX_OBJECTIVES: 5,
    MCQS_PER_OBJECTIVE: 3,
    MIN_MCQ_OPTIONS: 4,
    MAX_MCQ_OPTIONS: 4,
  },

  // Session configuration
  SESSION: {
    TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
    MAX_ACTIVE_THREADS: 100,
  },

  // Validation
  VALIDATION: {
    MAX_TEXT_LENGTH: 10000,
    MAX_QUESTION_LENGTH: 500,
    MAX_OPTION_LENGTH: 200,
  },

  // Feature flags
  FEATURES: {
    ENABLE_LOGGING: process.env.ENABLE_LOGGING === "true",
    ENABLE_METRICS: process.env.ENABLE_METRICS === "true",
    DEBUG_MODE: process.env.DEBUG === "true",
  },
} as const;

// Type for the config object
export type AppConfig = typeof CONFIG;

/**
 * Validate required environment variables
 */
export function validateConfig(): void {
  const required = ["OPENAI_API_KEY"];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

/**
 * Get a nested config value safely
 */
export function getConfigValue<T>(path: string, defaultValue?: T): T {
  const keys = path.split(".");
  let value: Record<string, unknown> | unknown = CONFIG;

  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return defaultValue as T;
    }
  }

  return value as T;
}
