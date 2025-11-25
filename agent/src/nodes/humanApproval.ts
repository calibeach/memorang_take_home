import { interrupt } from "@langchain/langgraph";
import type { LearningState } from "../state.js";
import {
  logger,
  logAgentThinking,
  logAgentDecision,
  logAgentSuccess,
  logAgentError,
} from "../utils/logger.js";

/**
 * Node that pauses execution for human approval of the learning plan.
 * Uses LangGraph's interrupt mechanism for HITL workflow.
 */
export async function humanApprovalNode(state: LearningState): Promise<Partial<LearningState>> {
  logger.startSection("Human-in-the-Loop Approval Agent");

  const { learningObjectives } = state;

  logAgentThinking("HITL Agent", "Checking if learning objectives are ready for approval");

  if (!learningObjectives || learningObjectives.length === 0) {
    logAgentError("HITL Agent", "No learning objectives found to approve");
    logger.endSection();
    return {
      error: "No learning objectives to approve. Please try uploading the PDF again.",
      currentPhase: "upload",
    };
  }

  logAgentThinking("HITL Agent", "Preparing learning plan for human review", {
    objectiveCount: learningObjectives.length,
    objectives: learningObjectives.map((o) => o.title),
  });

  logger.info("HITL Agent", "Initiating human approval workflow");
  logger.indent();
  logger.think("HITL Agent", "Pausing execution to wait for user decision");
  logger.think("HITL Agent", "User can approve to proceed or reject to start over");
  logger.outdent();

  // Use LangGraph's interrupt to pause and wait for user approval
  // The frontend will receive this interrupt and display the approval UI
  const approved = interrupt({
    type: "plan_approval",
    message: "Please review and approve the learning plan before proceeding.",
    plan: learningObjectives,
    totalObjectives: learningObjectives.length,
  });

  logAgentDecision("HITL Agent", `User response received: ${approved ? "APPROVED" : "REJECTED"}`, {
    userDecision: approved,
    timestamp: new Date().toISOString(),
  });

  if (approved) {
    logAgentSuccess("HITL Agent", "Learning plan approved by user", {
      nextPhase: "quiz",
      objectivesToProcess: learningObjectives.length,
    });
    logger.endSection();
    return {
      planApproved: true,
      currentPhase: "quiz",
      error: null,
    };
  } else {
    // User rejected the plan - go back to upload
    logAgentDecision("HITL Agent", "User rejected the plan, resetting workflow", {
      action: "reset",
      returnToPhase: "upload",
    });
    logger.endSection();
    return {
      planApproved: false,
      learningObjectives: [],
      pdfContent: "",
      pdfPath: null,
      currentPhase: "upload",
      error: null,
    };
  }
}
