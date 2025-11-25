import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { LearningProvider, useLearningContext } from "./LearningContext";
import type { ReactNode } from "react";

// Wrapper for testing hooks that require context
const wrapper = ({ children }: { children: ReactNode }) => (
  <LearningProvider>{children}</LearningProvider>
);

describe("LearningContext", () => {
  describe("initial state", () => {
    it("should have correct initial values", () => {
      const { result } = renderHook(() => useLearningContext(), { wrapper });

      expect(result.current.state.threadId).toBeNull();
      expect(result.current.state.pdfPath).toBeNull();
      expect(result.current.state.phase).toBe("upload");
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.objectives).toEqual([]);
      expect(result.current.state.currentMcq).toBeNull();
      expect(result.current.state.progressReport).toBeNull();
    });
  });

  describe("actions", () => {
    it("should set thread and pdfPath", () => {
      const { result } = renderHook(() => useLearningContext(), { wrapper });

      act(() => {
        result.current.actions.setThread("thread-123", "/path/to/pdf");
      });

      expect(result.current.state.threadId).toBe("thread-123");
      expect(result.current.state.pdfPath).toBe("/path/to/pdf");
    });

    it("should set phase", () => {
      const { result } = renderHook(() => useLearningContext(), { wrapper });

      act(() => {
        result.current.actions.setPhase("planning");
      });

      expect(result.current.state.phase).toBe("planning");
    });

    it("should set loading state", () => {
      const { result } = renderHook(() => useLearningContext(), { wrapper });

      act(() => {
        result.current.actions.setLoading(true);
      });

      expect(result.current.state.isLoading).toBe(true);

      act(() => {
        result.current.actions.setLoading(false);
      });

      expect(result.current.state.isLoading).toBe(false);
    });

    it("should set error", () => {
      const { result } = renderHook(() => useLearningContext(), { wrapper });

      act(() => {
        result.current.actions.setError("Something went wrong");
      });

      expect(result.current.state.error).toBe("Something went wrong");

      act(() => {
        result.current.actions.setError(null);
      });

      expect(result.current.state.error).toBeNull();
    });

    it("should set objectives with optional summary and time", () => {
      const { result } = renderHook(() => useLearningContext(), { wrapper });

      const objectives = [
        {
          id: "obj-1",
          title: "Learn React",
          description: "Basics",
          difficulty: "beginner" as const,
        },
      ];

      act(() => {
        result.current.actions.setObjectives(objectives, "A summary", "30 mins");
      });

      expect(result.current.state.objectives).toEqual(objectives);
      expect(result.current.state.planSummary).toBe("A summary");
      expect(result.current.state.estimatedTime).toBe("30 mins");
    });

    it("should set MCQ with index and total", () => {
      const { result } = renderHook(() => useLearningContext(), { wrapper });

      const mcq = {
        id: "q1",
        objectiveId: "obj-1",
        question: "What is React?",
        options: ["A", "B", "C", "D"],
        correctAnswer: 0,
        hint: "Think about UI",
        explanation: "React is a UI library",
      };

      act(() => {
        result.current.actions.setMcq(mcq, 2, 10);
      });

      expect(result.current.state.currentMcq).toEqual(mcq);
      expect(result.current.state.mcqIndex).toBe(2);
      expect(result.current.state.totalMcqs).toBe(10);
    });

    it("should set progress report", () => {
      const { result } = renderHook(() => useLearningContext(), { wrapper });

      const report = {
        totalQuestions: 10,
        correctAnswers: 8,
        score: 80,
        objectivesCompleted: 3,
        studyTips: ["Keep practicing"],
        areasToReview: ["Advanced topics"],
      };

      act(() => {
        result.current.actions.setProgressReport(report);
      });

      expect(result.current.state.progressReport).toEqual(report);
    });

    it("should increment attempt count", () => {
      const { result } = renderHook(() => useLearningContext(), { wrapper });

      act(() => {
        result.current.actions.incrementAttempt("q1");
      });

      expect(result.current.state.userAttempts["q1"]).toBe(1);

      act(() => {
        result.current.actions.incrementAttempt("q1");
      });

      expect(result.current.state.userAttempts["q1"]).toBe(2);
    });

    it("should reset state to initial values", () => {
      const { result } = renderHook(() => useLearningContext(), { wrapper });

      // Set some state
      act(() => {
        result.current.actions.setThread("thread-123", "/path");
        result.current.actions.setPhase("quiz");
        result.current.actions.setError("An error");
      });

      expect(result.current.state.threadId).toBe("thread-123");
      expect(result.current.state.phase).toBe("quiz");

      // Reset
      act(() => {
        result.current.actions.reset();
      });

      expect(result.current.state.threadId).toBeNull();
      expect(result.current.state.phase).toBe("upload");
      expect(result.current.state.error).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useLearningContext());
      }).toThrow("useLearningContext must be used within a LearningProvider");

      consoleSpy.mockRestore();
    });
  });
});
