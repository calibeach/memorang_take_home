/**
 * Central configuration and constants for the frontend
 */

export const UI_CONFIG = {
  // API Configuration
  API: {
    BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    TIMEOUT_MS: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,
  },

  // File Upload
  FILE: {
    MAX_SIZE_MB: 10,
    MAX_SIZE_BYTES: 10 * 1024 * 1024,
    ALLOWED_TYPES: ["application/pdf"],
    ALLOWED_EXTENSIONS: [".pdf"],
  },

  // UI Behavior
  UI: {
    DEBOUNCE_MS: 300,
    THROTTLE_MS: 100,
    ANIMATION_DURATION_MS: 200,
    TOAST_DURATION_MS: 5000,
    LOADING_DELAY_MS: 500,
  },

  // Learning Flow
  LEARNING: {
    MIN_OBJECTIVES: 3,
    MAX_OBJECTIVES: 5,
    MCQS_PER_OBJECTIVE: 3,
    MIN_PASSING_SCORE: 70, // percentage
    HINT_UNLOCK_AFTER_ATTEMPTS: 2,
  },

  // Phases
  PHASES: {
    UPLOAD: "upload",
    PARSING: "parsing",
    PLANNING: "planning",
    APPROVAL: "approval",
    QUIZ: "quiz",
    SUMMARY: "summary",
  } as const,

  // Local Storage Keys
  STORAGE_KEYS: {
    THEME: "memorang_theme",
    SESSION_ID: "memorang_session",
    PREFERENCES: "memorang_preferences",
  },

  // Validation
  VALIDATION: {
    MIN_TEXT_LENGTH: 1,
    MAX_TEXT_LENGTH: 10000,
    MAX_QUESTION_LENGTH: 500,
    MAX_OPTION_LENGTH: 200,
    MIN_PDF_WORDS: 50,
  },

  // Layout
  LAYOUT: {
    CONTENT_SPLIT: 70, // 70% for main content
    SIDEBAR_SPLIT: 30, // 30% for chat sidebar
    MAX_WIDTH: "1200px",
    MOBILE_BREAKPOINT: 768,
  },

  // Messages
  MESSAGES: {
    UPLOAD_SUCCESS: "PDF uploaded successfully",
    UPLOAD_ERROR: "Failed to upload PDF",
    PARSING_ERROR: "Failed to parse PDF content",
    NETWORK_ERROR: "Network error. Please check your connection.",
    TIMEOUT_ERROR: "Request timed out. Please try again.",
    VALIDATION_ERROR: "Please check your input and try again.",
    GENERIC_ERROR: "Something went wrong. Please try again.",
  },
} as const;

// Type for the config object
export type UIConfig = typeof UI_CONFIG;

// Phase type
export type Phase = (typeof UI_CONFIG.PHASES)[keyof typeof UI_CONFIG.PHASES];

// Helper to get nested config value
export function getConfig<T>(path: string, defaultValue?: T): T {
  const keys = path.split(".");
  let value: any = UI_CONFIG;

  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) {
      return defaultValue as T;
    }
  }

  return value as T;
}

// Export individual sections for convenience
export const API_CONFIG = UI_CONFIG.API;
export const FILE_CONFIG = UI_CONFIG.FILE;
export const PHASES = UI_CONFIG.PHASES;
export const MESSAGES = UI_CONFIG.MESSAGES;
export const VALIDATION = UI_CONFIG.VALIDATION;
