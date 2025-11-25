const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function uploadPdf(file: File): Promise<{
  threadId: string;
  pdfPath: string;
  message: string;
}> {
  const formData = new FormData();
  formData.append("pdf", file);

  const response = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Upload failed");
  }

  return response.json();
}

import type { LearningState, InterruptData } from "./types";

export async function invokeWorkflow(
  threadId: string,
  pdfPath?: string,
  resumeValue?: boolean | number | string
): Promise<{
  state: Partial<LearningState>;
  interrupted: boolean;
  interruptData?: InterruptData;
}> {
  const response = await fetch(`${API_BASE}/api/threads/${threadId}/invoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pdfPath, resumeValue }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Workflow invocation failed");
  }

  return response.json();
}

export async function submitAnswer(
  threadId: string,
  questionId: string,
  answer: number
): Promise<{
  state: Partial<LearningState>;
  interrupted: boolean;
  interruptData?: InterruptData;
}> {
  // Use the invoke endpoint with resumeValue - same pattern as handleApproval
  // This fixes EmptyInputError that occurred with the dedicated /answer endpoint
  return invokeWorkflow(threadId, undefined, answer);
}

export async function getThreadState(threadId: string): Promise<{
  state: Partial<LearningState>;
  next: string[];
}> {
  const response = await fetch(`${API_BASE}/api/threads/${threadId}/state`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get state");
  }

  return response.json();
}
