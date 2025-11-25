/**
 * API helper functions for consistent error handling and request processing
 */

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Handle API response and extract JSON
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorDetails: any = undefined;

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
      errorDetails = errorData.details;
    } catch {
      // If JSON parsing fails, use default error message
    }

    throw new ApiError(errorMessage, response.status, errorDetails);
  }

  try {
    return await response.json();
  } catch {
    throw new ApiError("Invalid response format", response.status);
  }
}

/**
 * Build headers for API requests
 */
export function buildHeaders(
  options: {
    contentType?: string;
    authorization?: string;
    additional?: Record<string, string>;
  } = {}
): HeadersInit {
  const headers: Record<string, string> = {};

  if (options.contentType) {
    headers["Content-Type"] = options.contentType;
  }

  if (options.authorization) {
    headers["Authorization"] = options.authorization;
  }

  if (options.additional) {
    Object.assign(headers, options.additional);
  }

  return headers;
}

/**
 * Simple retry logic for failed requests
 */
export async function retryableRequest<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    shouldRetry = (error) => {
      if (error instanceof ApiError) {
        // Retry on 5xx errors or network errors
        return error.statusCode >= 500 || error.statusCode === 0;
      }
      return false;
    },
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }

  throw lastError;
}

/**
 * Build URL with query parameters
 */
export function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(path, baseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

/**
 * Parse error to get user-friendly message
 */
export function parseApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes("Failed to fetch")) {
      return "Network error. Please check your connection.";
    }
    if (error.message.includes("NetworkError")) {
      return "Unable to connect to the server.";
    }
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred";
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes("Failed to fetch") ||
      error.message.includes("NetworkError") ||
      error.message.includes("ERR_NETWORK")
    );
  }
  return false;
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes("timeout") ||
      error.message.includes("Timeout") ||
      error.name === "TimeoutError"
    );
  }
  return false;
}

/**
 * Create abort controller with timeout
 */
export function createAbortController(timeoutMs: number = 30000): {
  controller: AbortController;
  timeoutId: NodeJS.Timeout;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return { controller, timeoutId };
}

/**
 * Format error for display to user
 */
export function formatErrorForDisplay(error: unknown): {
  title: string;
  message: string;
  isRetryable: boolean;
} {
  const message = parseApiError(error);

  if (isNetworkError(error)) {
    return {
      title: "Connection Error",
      message,
      isRetryable: true,
    };
  }

  if (isTimeoutError(error)) {
    return {
      title: "Request Timeout",
      message: "The request took too long. Please try again.",
      isRetryable: true,
    };
  }

  if (error instanceof ApiError) {
    if (error.statusCode === 400) {
      return {
        title: "Invalid Request",
        message,
        isRetryable: false,
      };
    }
    if (error.statusCode === 404) {
      return {
        title: "Not Found",
        message,
        isRetryable: false,
      };
    }
    if (error.statusCode >= 500) {
      return {
        title: "Server Error",
        message: "The server encountered an error. Please try again later.",
        isRetryable: true,
      };
    }
  }

  return {
    title: "Error",
    message,
    isRetryable: false,
  };
}
