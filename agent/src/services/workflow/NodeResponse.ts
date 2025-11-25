import type { LearningState } from "../../state.js";

type Phase = LearningState["currentPhase"];

/**
 * Helper class for creating standardized node responses.
 */
export class NodeResponse {
  /**
   * Create an error response that resets to a safe phase.
   * @param message - The error message
   * @param phase - The phase to reset to (default: "upload")
   * @returns Partial state with error and phase
   */
  static error(message: string, phase: Phase = "upload"): Partial<LearningState> {
    return {
      error: message,
      currentPhase: phase,
    };
  }

  /**
   * Create a success response with optional phase transition.
   * @param updates - State updates to apply
   * @param phase - Optional new phase
   * @returns Partial state with updates and cleared error
   */
  static success(updates: Partial<LearningState>, phase?: Phase): Partial<LearningState> {
    return {
      ...updates,
      ...(phase && { currentPhase: phase }),
      error: null,
    };
  }

  /**
   * Extract error message from an unknown error.
   * @param err - The caught error
   * @returns A string error message
   */
  static extractErrorMessage(err: unknown): string {
    return err instanceof Error ? err.message : "Unknown error";
  }
}
