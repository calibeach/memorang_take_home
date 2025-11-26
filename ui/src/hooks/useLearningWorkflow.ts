"use client";

import { useCallback, useRef } from "react";
import { useLearningContext } from "@/contexts";
import { uploadPdf, invokeWorkflow, submitAnswer } from "@/lib/api";
import type { Phase, LearningObjective, MCQ, ProgressReport, InterruptData } from "@/lib/types";

interface WorkflowResponse {
  state: Record<string, unknown>;
  interrupted: boolean;
  interruptData?: unknown;
}

export function useLearningWorkflow() {
  const { state, actions } = useLearningContext();

  // Store current MCQ data for answer validation
  const currentMcqDataRef = useRef<InterruptData | null>(null);

  // Process workflow response from backend
  const processResponse = useCallback(
    (response: WorkflowResponse) => {
      const { state: responseState, interrupted, interruptData } = response;

      // Update phase
      if (responseState.currentPhase) {
        actions.setPhase(responseState.currentPhase as Phase);
      }

      // Handle errors
      if (responseState.error) {
        actions.setError(responseState.error as string);
        return;
      }

      // Handle interrupts
      if (interrupted && interruptData) {
        const data = interruptData as InterruptData;

        if (data.type === "approve_plan" && data.plan) {
          actions.setObjectives(
            data.plan.objectives,
            data.plan.summary || "",
            data.plan.estimatedTime || ""
          );
          actions.setPhase("approval");
        } else if (data.type === "answer_mcq") {
          // Store full MCQ data for local answer validation
          currentMcqDataRef.current = data;

          const mcq: MCQ = {
            id: data.questionId || "",
            objectiveId: "",
            question: data.question || "",
            options: data.options || [],
            correctAnswer: data.correctAnswer ?? -1,
            hint: data.hint || "",
            explanation: data.explanation || "",
          };
          actions.setMcq(mcq, data.currentIndex || 0, data.totalQuestions || 0);
          actions.setPhase("quiz");
          // Clear any previous feedback when showing new question
          actions.setAnswerFeedback(null);
        }
      }

      // Handle completion
      if (responseState.sessionComplete && responseState.progressReport) {
        actions.setProgressReport(responseState.progressReport as ProgressReport);
        actions.setPhase("summary");
      }

      // Update objectives if available
      if (responseState.learningObjectives) {
        actions.setObjectives(responseState.learningObjectives as LearningObjective[]);
      }

      // Update MCQs if available
      // Note: Don't pass total here - it's already set correctly by the interrupt handler
      // using data.totalQuestions which includes ALL questions across ALL objectives
      if (responseState.mcqs) {
        const mcqs = responseState.mcqs as MCQ[];
        const currentIdx =
          typeof responseState.currentMcqIdx === "number" ? responseState.currentMcqIdx : 0;
        if (mcqs[currentIdx]) {
          actions.setMcq(mcqs[currentIdx], currentIdx);
        }
      }
    },
    [actions]
  );

  // Handle PDF upload
  const handleUpload = useCallback(
    async (file: File) => {
      actions.setLoading(true);
      actions.setError(null);

      try {
        const uploadResult = await uploadPdf(file);
        actions.setThread(uploadResult.threadId, uploadResult.pdfPath);

        actions.setPhase("parsing");
        const response = await invokeWorkflow(uploadResult.threadId, uploadResult.pdfPath);

        processResponse(response);
      } catch (err) {
        actions.setError(err instanceof Error ? err.message : "Upload failed");
        actions.setPhase("upload");
      } finally {
        actions.setLoading(false);
      }
    },
    [actions, processResponse]
  );

  // Handle plan approval
  const handleApproval = useCallback(
    async (approved: boolean) => {
      if (!state.threadId) return;

      actions.setLoading(true);
      actions.setError(null);

      try {
        const response = await invokeWorkflow(state.threadId, undefined, approved);
        processResponse(response);
      } catch (err) {
        actions.setError(err instanceof Error ? err.message : "Failed to process approval");
      } finally {
        actions.setLoading(false);
      }
    },
    [state.threadId, actions, processResponse]
  );

  // Handle MCQ answer - validates locally and shows feedback
  const handleAnswer = useCallback(
    (answer: number) => {
      if (!state.currentMcq) return;

      const correctAnswer = state.currentMcq.correctAnswer;
      const isCorrect = answer === correctAnswer;

      // Show feedback immediately (local validation)
      actions.setAnswerFeedback({
        isCorrect,
        selectedAnswer: answer,
        correctAnswer,
        hint: state.currentMcq.hint,
        explanation: state.currentMcq.explanation,
      });
    },
    [state.currentMcq, actions]
  );

  // Handle continue after correct answer - submits to backend to move to next question
  const handleContinue = useCallback(async () => {
    if (!state.threadId || !state.currentMcq || !state.answerFeedback?.isCorrect) return;

    actions.setLoading(true);
    actions.setError(null);

    try {
      // Submit the correct answer to backend
      const response = await submitAnswer(
        state.threadId,
        state.currentMcq.id,
        state.answerFeedback.selectedAnswer
      );
      processResponse(response);
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : "Failed to continue");
    } finally {
      actions.setLoading(false);
    }
  }, [state.threadId, state.currentMcq, state.answerFeedback, actions, processResponse]);

  // Handle retry after incorrect answer - clears feedback to allow another attempt
  const handleRetry = useCallback(() => {
    actions.setAnswerFeedback(null);
  }, [actions]);

  // Handle restart
  const handleRestart = useCallback(() => {
    currentMcqDataRef.current = null;
    actions.reset();
  }, [actions]);

  return {
    handleUpload,
    handleApproval,
    handleAnswer,
    handleContinue,
    handleRetry,
    handleRestart,
  };
}
