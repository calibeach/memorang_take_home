"use client";

import { createContext, useContext, useReducer, useCallback, type ReactNode } from "react";
import type { Phase, LearningObjective, MCQ, ProgressReport, AnswerFeedback } from "@/lib/types";

// State interface
export interface LearningSessionState {
  // Session
  threadId: string | null;
  pdfPath: string | null;
  phase: Phase;
  isLoading: boolean;
  error: string | null;

  // Learning content
  objectives: LearningObjective[];
  planSummary: string;
  estimatedTime: string;
  currentMcq: MCQ | null;
  mcqIndex: number;
  totalMcqs: number;
  progressReport: ProgressReport | null;
  userAttempts: Record<string, number>;
  pdfSummary: string;

  // Answer feedback for showing correct/incorrect state
  answerFeedback: AnswerFeedback | null;
}

// Action types
type LearningAction =
  | { type: "SET_THREAD"; threadId: string; pdfPath: string }
  | { type: "SET_PHASE"; phase: Phase }
  | { type: "SET_LOADING"; isLoading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | {
      type: "SET_OBJECTIVES";
      objectives: LearningObjective[];
      summary?: string;
      estimatedTime?: string;
    }
  | { type: "SET_MCQ"; mcq: MCQ | null; index?: number; total?: number }
  | { type: "SET_PROGRESS_REPORT"; report: ProgressReport }
  | { type: "INCREMENT_ATTEMPT"; questionId: string }
  | { type: "SET_ANSWER_FEEDBACK"; feedback: AnswerFeedback | null }
  | { type: "RESET" };

// Initial state
const initialState: LearningSessionState = {
  threadId: null,
  pdfPath: null,
  phase: "upload",
  isLoading: false,
  error: null,
  objectives: [],
  planSummary: "",
  estimatedTime: "",
  currentMcq: null,
  mcqIndex: 0,
  totalMcqs: 0,
  progressReport: null,
  userAttempts: {},
  pdfSummary: "",
  answerFeedback: null,
};

// Reducer
function learningReducer(
  state: LearningSessionState,
  action: LearningAction
): LearningSessionState {
  switch (action.type) {
    case "SET_THREAD":
      return { ...state, threadId: action.threadId, pdfPath: action.pdfPath };
    case "SET_PHASE":
      return { ...state, phase: action.phase };
    case "SET_LOADING":
      return { ...state, isLoading: action.isLoading };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "SET_OBJECTIVES":
      return {
        ...state,
        objectives: action.objectives,
        planSummary: action.summary ?? state.planSummary,
        estimatedTime: action.estimatedTime ?? state.estimatedTime,
      };
    case "SET_MCQ":
      return {
        ...state,
        currentMcq: action.mcq,
        mcqIndex: action.index ?? state.mcqIndex,
        totalMcqs: action.total ?? state.totalMcqs,
      };
    case "SET_PROGRESS_REPORT":
      return { ...state, progressReport: action.report };
    case "INCREMENT_ATTEMPT":
      return {
        ...state,
        userAttempts: {
          ...state.userAttempts,
          [action.questionId]: (state.userAttempts[action.questionId] || 0) + 1,
        },
      };
    case "SET_ANSWER_FEEDBACK":
      return { ...state, answerFeedback: action.feedback };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// Context interface
interface LearningContextValue {
  state: LearningSessionState;
  dispatch: React.Dispatch<LearningAction>;
  actions: {
    setThread: (threadId: string, pdfPath: string) => void;
    setPhase: (phase: Phase) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    setObjectives: (
      objectives: LearningObjective[],
      summary?: string,
      estimatedTime?: string
    ) => void;
    setMcq: (mcq: MCQ | null, index?: number, total?: number) => void;
    setProgressReport: (report: ProgressReport) => void;
    incrementAttempt: (questionId: string) => void;
    setAnswerFeedback: (feedback: AnswerFeedback | null) => void;
    reset: () => void;
  };
}

// Create context
const LearningContext = createContext<LearningContextValue | null>(null);

// Provider component
export function LearningProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(learningReducer, initialState);

  // Memoized action creators
  const actions = {
    setThread: useCallback((threadId: string, pdfPath: string) => {
      dispatch({ type: "SET_THREAD", threadId, pdfPath });
    }, []),
    setPhase: useCallback((phase: Phase) => {
      dispatch({ type: "SET_PHASE", phase });
    }, []),
    setLoading: useCallback((isLoading: boolean) => {
      dispatch({ type: "SET_LOADING", isLoading });
    }, []),
    setError: useCallback((error: string | null) => {
      dispatch({ type: "SET_ERROR", error });
    }, []),
    setObjectives: useCallback(
      (objectives: LearningObjective[], summary?: string, estimatedTime?: string) => {
        dispatch({ type: "SET_OBJECTIVES", objectives, summary, estimatedTime });
      },
      []
    ),
    setMcq: useCallback((mcq: MCQ | null, index?: number, total?: number) => {
      dispatch({ type: "SET_MCQ", mcq, index, total });
    }, []),
    setProgressReport: useCallback((report: ProgressReport) => {
      dispatch({ type: "SET_PROGRESS_REPORT", report });
    }, []),
    incrementAttempt: useCallback((questionId: string) => {
      dispatch({ type: "INCREMENT_ATTEMPT", questionId });
    }, []),
    setAnswerFeedback: useCallback((feedback: AnswerFeedback | null) => {
      dispatch({ type: "SET_ANSWER_FEEDBACK", feedback });
    }, []),
    reset: useCallback(() => {
      dispatch({ type: "RESET" });
    }, []),
  };

  return (
    <LearningContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </LearningContext.Provider>
  );
}

// Hook to use the context
export function useLearningContext() {
  const context = useContext(LearningContext);
  if (!context) {
    throw new Error("useLearningContext must be used within a LearningProvider");
  }
  return context;
}
