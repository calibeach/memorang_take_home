import type { LearningObjective } from "../schemas/index.js";

/**
 * Interrupt payload for plan approval.
 */
export interface PlanApprovalInterrupt {
  type: "plan_approval";
  message: string;
  plan: LearningObjective[];
}

/**
 * Interrupt payload for answering MCQs.
 */
export interface AnswerMCQInterrupt {
  type: "answer_mcq";
  questionId: string;
  objectiveId: string;
  question: string;
  options: string[];
  correctAnswer: number;
  hint: string;
  explanation: string;
  currentIndex: number;
  totalQuestions: number;
  /** Number of attempts on this question (starts at 1) */
  attemptCount: number;
}

/**
 * Union type of all interrupt payloads.
 */
export type InterruptPayload = PlanApprovalInterrupt | AnswerMCQInterrupt;

/**
 * Type guard for PlanApprovalInterrupt.
 */
export function isPlanApprovalInterrupt(data: unknown): data is PlanApprovalInterrupt {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return obj.type === "plan_approval" && Array.isArray(obj.plan);
}

/**
 * Type guard for AnswerMCQInterrupt.
 */
export function isAnswerMCQInterrupt(data: unknown): data is AnswerMCQInterrupt {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.type === "answer_mcq" &&
    typeof obj.questionId === "string" &&
    typeof obj.question === "string" &&
    Array.isArray(obj.options)
  );
}

/**
 * Type guard for any known interrupt payload.
 */
export function isKnownInterrupt(data: unknown): data is InterruptPayload {
  return isPlanApprovalInterrupt(data) || isAnswerMCQInterrupt(data);
}
