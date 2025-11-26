import {
  isPlanApprovalInterrupt,
  isAnswerMCQInterrupt,
  isKnownInterrupt,
  type InterruptPayload,
  type PlanApprovalInterrupt,
  type AnswerMCQInterrupt,
} from "../../types/interrupts.js";

interface TaskWithInterrupts {
  interrupts?: unknown[];
}

export interface InterruptResult {
  isInterrupted: boolean;
  interruptData: unknown | null;
}

/**
 * Typed interrupt result when the interrupt is a known type.
 */
export interface TypedInterruptResult<T extends InterruptPayload> {
  isInterrupted: true;
  interruptData: T;
}

/**
 * Service for handling LangGraph workflow interrupts.
 */
export class InterruptHandler {
  /**
   * Check if the workflow state has any active interrupts.
   * @param tasks - Array of tasks from workflow state
   * @returns True if any task has interrupts
   */
  static hasInterrupt(tasks: TaskWithInterrupts[]): boolean {
    return tasks.some((t) => t.interrupts && t.interrupts.length > 0);
  }

  /**
   * Extract the interrupt data from the first interrupted task.
   * @param tasks - Array of tasks from workflow state
   * @returns The interrupt data or null if no interrupt
   */
  static getInterruptData(tasks: TaskWithInterrupts[]): unknown | null {
    const interruptTask = tasks.find((t) => t.interrupts && t.interrupts.length > 0);
    return interruptTask?.interrupts?.[0] ?? null;
  }

  /**
   * Check for interrupts and extract data in one call.
   * @param tasks - Array of tasks from workflow state
   * @returns InterruptResult with status and data
   */
  static check(tasks: TaskWithInterrupts[]): InterruptResult {
    return {
      isInterrupted: this.hasInterrupt(tasks),
      interruptData: this.getInterruptData(tasks),
    };
  }

  /**
   * Type guard: Check if interrupt is a plan approval.
   */
  static isPlanApproval(data: unknown): data is PlanApprovalInterrupt {
    return isPlanApprovalInterrupt(data);
  }

  /**
   * Type guard: Check if interrupt is an MCQ answer request.
   */
  static isAnswerMCQ(data: unknown): data is AnswerMCQInterrupt {
    return isAnswerMCQInterrupt(data);
  }

  /**
   * Type guard: Check if interrupt is a known type.
   */
  static isKnownType(data: unknown): data is InterruptPayload {
    return isKnownInterrupt(data);
  }
}

// Re-export types for convenience
export type { InterruptPayload, PlanApprovalInterrupt, AnswerMCQInterrupt };
