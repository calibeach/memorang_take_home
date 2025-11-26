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

  // Store pending next question to apply when Continue is clicked
  const pendingNextMcqRef = useRef<{ mcq: MCQ; index: number; total: number } | null>(null);

  // Process workflow response from backend
  // selectedAnswer param is passed directly from handleAnswer to avoid stale state closure
  const processResponse = useCallback(
    (response: WorkflowResponse, selectedAnswer?: number) => {
      const { state: responseState, interrupted, interruptData } = response;

      // Track if we stored a pending next MCQ (to skip responseState.mcqs update)
      let storedPendingNextMcq = false;

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
            objectiveId: data.objectiveId || "",
            question: data.question || "",
            options: data.options || [],
            correctAnswer: data.correctAnswer ?? -1,
            hint: data.hint || "",
            explanation: data.explanation || "",
          };

          // Check if this is a retry (same question, wrong answer) vs new question
          const isSameQuestion = state.currentMcq?.id === data.questionId;
          const isRetry = isSameQuestion && (data.attemptCount ?? 1) > 1;
          const justSubmittedAnswer = selectedAnswer !== undefined;
          const movedToNextQuestion = justSubmittedAnswer && !isSameQuestion;

          if (isRetry) {
            // Wrong answer - show feedback with progressive hint from backend
            actions.setAnswerFeedback({
              isCorrect: false,
              selectedAnswer: selectedAnswer ?? 0,
              correctAnswer: data.correctAnswer ?? -1,
              hint: data.hint, // Progressive hint from backend
              explanation: data.explanation,
              attemptCount: data.attemptCount,
            });
            // Update the MCQ with the new hint
            actions.setMcq(mcq, data.currentIndex || 0, data.totalQuestions || 0);
          } else if (movedToNextQuestion) {
            // Correct answer - show success feedback with CURRENT question still displayed
            actions.setAnswerFeedback({
              isCorrect: true,
              selectedAnswer: selectedAnswer ?? 0,
              correctAnswer: state.currentMcq?.correctAnswer ?? -1,
              explanation: state.currentMcq?.explanation,
            });
            // Store next question to apply when Continue is clicked
            // DON'T set new MCQ here - keep showing current question with feedback
            pendingNextMcqRef.current = {
              mcq,
              index: data.currentIndex || 0,
              total: data.totalQuestions || 0,
            };
            storedPendingNextMcq = true;
          } else {
            // First time seeing this question (initial load or after retry cleared)
            actions.setMcq(mcq, data.currentIndex || 0, data.totalQuestions || 0);
            actions.setPhase("quiz");
            // Clear any previous feedback when showing new question
            actions.setAnswerFeedback(null);
          }
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

      // Update MCQs if available (but skip if we stored a pending next MCQ)
      // Note: Don't pass total here - it's already set correctly by the interrupt handler
      // using data.totalQuestions which includes ALL questions across ALL objectives
      if (responseState.mcqs && !storedPendingNextMcq) {
        const mcqs = responseState.mcqs as MCQ[];
        const currentIdx =
          typeof responseState.currentMcqIdx === "number" ? responseState.currentMcqIdx : 0;
        if (mcqs[currentIdx]) {
          actions.setMcq(mcqs[currentIdx], currentIdx);
        }
      }
    },
    [actions, state.currentMcq]
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

  // Handle MCQ answer - submits to backend for validation and progressive hints
  const handleAnswer = useCallback(
    async (answer: number) => {
      if (!state.threadId || !state.currentMcq) return;

      actions.setLoading(true);
      actions.setError(null);

      try {
        // Always submit answer to backend (correct or wrong)
        // Backend will update attemptCounts and return progressive hint if wrong
        const response = await submitAnswer(state.threadId, state.currentMcq.id, answer);

        // Process the response - pass answer directly to avoid stale state closure
        processResponse(response, answer);
      } catch (err) {
        actions.setError(err instanceof Error ? err.message : "Failed to submit answer");
      } finally {
        actions.setLoading(false);
      }
    },
    [state.threadId, state.currentMcq, actions, processResponse]
  );

  // Handle continue after viewing correct answer feedback - applies pending next question
  const handleContinue = useCallback(() => {
    // Apply pending next question if available
    if (pendingNextMcqRef.current) {
      const { mcq, index, total } = pendingNextMcqRef.current;
      actions.setMcq(mcq, index, total);
      pendingNextMcqRef.current = null;
    }
    actions.setAnswerFeedback(null);
  }, [actions]);

  // Handle retry after incorrect answer - clears feedback to allow another attempt
  const handleRetry = useCallback(() => {
    actions.setAnswerFeedback(null);
  }, [actions]);

  // Handle restart
  const handleRestart = useCallback(() => {
    currentMcqDataRef.current = null;
    pendingNextMcqRef.current = null;
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
