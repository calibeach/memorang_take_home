/**
 * Input validation utilities for the frontend
 */

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate PDF file
 */
export function validatePdfFile(file: File, maxSizeMB: number = 10): FileValidationResult {
  // Check file exists
  if (!file) {
    return {
      valid: false,
      error: "No file selected",
    };
  }

  // Check file type
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return {
      valid: false,
      error: "File must be a PDF",
    };
  }

  // Check file size
  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB`,
    };
  }

  // Check file name for suspicious patterns
  const suspiciousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.com$/i,
    /\.pif$/i,
    /\.scr$/i,
    /\.vbs$/i,
    /\.js$/i,
  ];

  if (suspiciousPatterns.some((pattern) => pattern.test(file.name))) {
    return {
      valid: false,
      error: "Invalid file name",
    };
  }

  return { valid: true };
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .slice(0, 1000); // Limit length
}

/**
 * Validate thread ID format
 */
export function isValidThreadId(id: string): boolean {
  if (!id) return false;
  return /^thread-\d+-[a-z0-9]{9}$/.test(id);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate number range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Validate required fields in an object
 */
export function validateRequired<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const field of fields) {
    if (!obj[field]) {
      missing.push(String(field));
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Validate text length
 */
export function validateTextLength(
  text: string,
  minLength: number,
  maxLength: number
): { valid: boolean; error?: string } {
  if (!text) {
    return {
      valid: false,
      error: "Text is required",
    };
  }

  if (text.length < minLength) {
    return {
      valid: false,
      error: `Text must be at least ${minLength} characters`,
    };
  }

  if (text.length > maxLength) {
    return {
      valid: false,
      error: `Text must be no more than ${maxLength} characters`,
    };
  }

  return { valid: true };
}

/**
 * Validate MCQ option selection
 */
export function isValidOptionIndex(index: number, totalOptions: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < totalOptions;
}

/**
 * Check if string contains only alphanumeric and basic punctuation
 */
export function isSafeText(text: string): boolean {
  // Allow letters, numbers, spaces, and basic punctuation
  const safePattern = /^[a-zA-Z0-9\s\-_.,!?'"]+$/;
  return safePattern.test(text);
}

/**
 * Strip HTML tags from text
 */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
