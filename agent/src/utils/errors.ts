/**
 * Custom error classes for better error handling and differentiation
 */

export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BaseError {
  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message, 400);
    this.details = details;
  }
}

export class NotFoundError extends BaseError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class ApiError extends BaseError {
  constructor(
    message: string,
    statusCode = 500,
    public readonly details?: unknown
  ) {
    super(message, statusCode);
    this.details = details;
  }
}

export class WorkflowError extends BaseError {
  constructor(
    message: string,
    public readonly phase?: string
  ) {
    super(message, 500);
    this.phase = phase;
  }
}

export class FileProcessingError extends BaseError {
  constructor(
    message: string,
    public readonly fileName?: string
  ) {
    super(message, 422);
    this.fileName = fileName;
  }
}

/**
 * Type guard to check if error is operational (expected)
 */
export function isOperationalError(error: unknown): error is BaseError {
  if (error instanceof BaseError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Convert unknown error to BaseError
 */
export function normalizeError(error: unknown): BaseError {
  if (error instanceof BaseError) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  if (typeof error === "string") {
    return new ApiError(error);
  }

  return new ApiError("An unknown error occurred");
}
