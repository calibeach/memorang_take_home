/**
 * Centralized API client with retry logic and proper error handling
 */

import { UI_CONFIG } from "@/config/constants";
import {
  ApiError,
  handleApiResponse,
  retryableRequest,
  createAbortController,
} from "./api-helpers";
import type { LearningState, InterruptData } from "./types";

/**
 * Response types
 */
export interface UploadResponse {
  threadId: string;
  pdfPath: string;
  message: string;
}

export interface WorkflowResponse {
  state: Partial<LearningState>;
  interrupted: boolean;
  interruptData?: InterruptData;
}

export interface ThreadStateResponse {
  state: Partial<LearningState>;
  next: string[];
}

/**
 * API Client class for all backend communication
 */
export class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config?: {
    baseUrl?: string;
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
  }) {
    this.baseUrl = config?.baseUrl || UI_CONFIG.API.BASE_URL;
    this.defaultTimeout = config?.timeout || UI_CONFIG.API.TIMEOUT_MS;
    this.maxRetries = config?.maxRetries || UI_CONFIG.API.RETRY_ATTEMPTS;
    this.retryDelay = config?.retryDelay || UI_CONFIG.API.RETRY_DELAY_MS;
  }

  /**
   * Upload a PDF file
   */
  async uploadPdf(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("pdf", file);

    const { controller, timeoutId } = createAbortController(this.defaultTimeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/upload`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      return await handleApiResponse<UploadResponse>(response);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError("Upload timed out", 408);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Invoke workflow with retry logic
   */
  async invokeWorkflow(
    threadId: string,
    pdfPath?: string,
    resumeValue?: boolean | number | string
  ): Promise<WorkflowResponse> {
    return retryableRequest(
      async () => {
        const { controller, timeoutId } = createAbortController(this.defaultTimeout);

        try {
          const response = await fetch(`${this.baseUrl}/api/threads/${threadId}/invoke`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ pdfPath, resumeValue }),
            signal: controller.signal,
          });

          return await handleApiResponse<WorkflowResponse>(response);
        } finally {
          clearTimeout(timeoutId);
        }
      },
      {
        maxRetries: this.maxRetries,
        delay: this.retryDelay,
      }
    );
  }

  /**
   * Submit an answer to a question
   */
  async submitAnswer(
    threadId: string,
    questionId: string,
    answer: number
  ): Promise<WorkflowResponse> {
    const { controller, timeoutId } = createAbortController(this.defaultTimeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/threads/${threadId}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questionId, answer }),
        signal: controller.signal,
      });

      return await handleApiResponse<WorkflowResponse>(response);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get current thread state
   */
  async getThreadState(threadId: string): Promise<ThreadStateResponse> {
    const { controller, timeoutId } = createAbortController(this.defaultTimeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/threads/${threadId}/state`, {
        method: "GET",
        signal: controller.signal,
      });

      return await handleApiResponse<ThreadStateResponse>(response);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const { controller, timeoutId } = createAbortController(5000);

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });

      return await handleApiResponse(response);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Cancel all pending requests (useful for cleanup)
   */
  cancelAllRequests(): void {
    // In a production app, we'd track all active controllers
    // For now, this is a placeholder for the pattern
    console.log("Cancelling all pending requests");
  }
}

// Export singleton instance
let apiClientInstance: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!apiClientInstance) {
    apiClientInstance = new ApiClient();
  }
  return apiClientInstance;
}

// Also export the functions for backward compatibility
export const apiClient = {
  uploadPdf: (file: File) => getApiClient().uploadPdf(file),
  invokeWorkflow: (threadId: string, pdfPath?: string, resumeValue?: boolean | number | string) =>
    getApiClient().invokeWorkflow(threadId, pdfPath, resumeValue),
  submitAnswer: (threadId: string, questionId: string, answer: number) =>
    getApiClient().submitAnswer(threadId, questionId, answer),
  getThreadState: (threadId: string) => getApiClient().getThreadState(threadId),
};
