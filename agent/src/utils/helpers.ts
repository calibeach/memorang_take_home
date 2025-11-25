/**
 * Common helper functions for the agent backend
 */

/**
 * Generate a unique ID with a prefix
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Truncate text content with ellipsis
 */
export function truncateContent(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  // Try to break at word boundary
  if (lastSpace > maxLength * 0.8) {
    return `${truncated.slice(0, lastSpace)}...`;
  }

  return `${truncated}...`;
}

/**
 * Validate PDF content has sufficient substance
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  wordCount?: number;
}

export function validatePdfContent(content: string): ValidationResult {
  if (!content) {
    return {
      valid: false,
      error: "PDF content is empty",
    };
  }

  // Count actual words (not just whitespace)
  const words = content.split(/\s+/).filter((word) => word.length > 0);
  const wordCount = words.length;

  const MIN_WORD_COUNT = 50; // Should be from config

  if (wordCount < MIN_WORD_COUNT) {
    return {
      valid: false,
      error: `PDF must contain at least ${MIN_WORD_COUNT} words. Found: ${wordCount}`,
      wordCount,
    };
  }

  // Check for actual text content (not just numbers or special chars)
  const hasReadableText = /[a-zA-Z]{10,}/.test(content);
  if (!hasReadableText) {
    return {
      valid: false,
      error: "PDF appears to contain no readable text content",
      wordCount,
    };
  }

  // Check if content is not just repeated characters
  const uniqueWords = new Set(words);
  if (uniqueWords.size < MIN_WORD_COUNT / 2) {
    return {
      valid: false,
      error: "PDF content appears to be repetitive or invalid",
      wordCount,
    };
  }

  return {
    valid: true,
    wordCount,
  };
}

/**
 * Async sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safe JSON parsing with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Extract key points from text (for summarization)
 */
export function extractKeyPoints(text: string, maxPoints = 5): string[] {
  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

  // Filter for substantive sentences (>10 words)
  const substantive = sentences.map((s) => s.trim()).filter((s) => s.split(/\s+/).length > 10);

  // Return first N sentences as key points
  return substantive.slice(0, maxPoints);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Check if a string is a valid thread ID
 */
export function isValidThreadId(id: string): boolean {
  return /^thread-\d+-[a-z0-9]{9}$/.test(id);
}

/**
 * Wrap async function with error handling
 */
export async function asyncWrapper<T>(
  fn: () => Promise<T>,
  errorMessage: string
): Promise<{ data?: T; error?: Error }> {
  try {
    const data = await fn();
    return { data };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error(errorMessage),
    };
  }
}
