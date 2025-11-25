import { describe, it, expect } from "vitest";
import { ScoreCalculator } from "./ScoreCalculator.js";
import type { MCQ, LearningObjective } from "../../schemas/index.js";

// Helper to create mock MCQs
const createMockMCQ = (id: string, objectiveId: string, correctAnswer: number): MCQ => ({
  id,
  objectiveId,
  question: `Question ${id}`,
  options: ["A", "B", "C", "D"],
  correctAnswer,
  hint: "A hint",
  explanation: "An explanation",
});

// Helper to create mock objectives
const createMockObjective = (id: string, title: string): LearningObjective => ({
  id,
  title,
  description: `Description for ${title}`,
  difficulty: "medium",
});

describe("ScoreCalculator", () => {
  describe("calculateScore", () => {
    it("should return 100% when all answers are correct", () => {
      const mcqs: MCQ[] = [
        createMockMCQ("q1", "obj-1", 0),
        createMockMCQ("q2", "obj-1", 1),
        createMockMCQ("q3", "obj-2", 2),
      ];
      const userAnswers = { q1: 0, q2: 1, q3: 2 };

      const result = ScoreCalculator.calculateScore(mcqs, userAnswers);

      expect(result.totalQuestions).toBe(3);
      expect(result.correctCount).toBe(3);
      expect(result.score).toBe(100);
    });

    it("should return 0% when all answers are incorrect", () => {
      const mcqs: MCQ[] = [createMockMCQ("q1", "obj-1", 0), createMockMCQ("q2", "obj-1", 1)];
      const userAnswers = { q1: 3, q2: 3 };

      const result = ScoreCalculator.calculateScore(mcqs, userAnswers);

      expect(result.totalQuestions).toBe(2);
      expect(result.correctCount).toBe(0);
      expect(result.score).toBe(0);
    });

    it("should calculate partial scores correctly", () => {
      const mcqs: MCQ[] = [
        createMockMCQ("q1", "obj-1", 0),
        createMockMCQ("q2", "obj-1", 1),
        createMockMCQ("q3", "obj-2", 2),
        createMockMCQ("q4", "obj-2", 3),
      ];
      const userAnswers = { q1: 0, q2: 3, q3: 2, q4: 0 }; // 2 correct, 2 wrong

      const result = ScoreCalculator.calculateScore(mcqs, userAnswers);

      expect(result.totalQuestions).toBe(4);
      expect(result.correctCount).toBe(2);
      expect(result.score).toBe(50);
    });

    it("should handle empty MCQ array", () => {
      const result = ScoreCalculator.calculateScore([], {});

      expect(result.totalQuestions).toBe(0);
      expect(result.correctCount).toBe(0);
      expect(result.score).toBe(0);
    });

    it("should handle missing user answers", () => {
      const mcqs: MCQ[] = [createMockMCQ("q1", "obj-1", 0), createMockMCQ("q2", "obj-1", 1)];
      const userAnswers = { q1: 0 }; // q2 not answered

      const result = ScoreCalculator.calculateScore(mcqs, userAnswers);

      expect(result.totalQuestions).toBe(2);
      expect(result.correctCount).toBe(1);
      expect(result.score).toBe(50);
    });

    it("should round scores correctly", () => {
      const mcqs: MCQ[] = [
        createMockMCQ("q1", "obj-1", 0),
        createMockMCQ("q2", "obj-1", 1),
        createMockMCQ("q3", "obj-1", 2),
      ];
      const userAnswers = { q1: 0, q2: 3, q3: 3 }; // 1/3 = 33.33%

      const result = ScoreCalculator.calculateScore(mcqs, userAnswers);

      expect(result.score).toBe(33); // Rounded
    });
  });

  describe("calculateObjectivePerformance", () => {
    it("should group performance by objective", () => {
      const mcqs: MCQ[] = [
        createMockMCQ("q1", "obj-1", 0),
        createMockMCQ("q2", "obj-1", 1),
        createMockMCQ("q3", "obj-2", 2),
      ];
      const userAnswers = { q1: 0, q2: 1, q3: 0 }; // obj-1: 2/2, obj-2: 0/1

      const result = ScoreCalculator.calculateObjectivePerformance(mcqs, userAnswers);

      expect(result).toHaveLength(2);

      const obj1 = result.find((p) => p.objectiveId === "obj-1");
      expect(obj1).toEqual({
        objectiveId: "obj-1",
        total: 2,
        correct: 2,
        percentage: 100,
      });

      const obj2 = result.find((p) => p.objectiveId === "obj-2");
      expect(obj2).toEqual({
        objectiveId: "obj-2",
        total: 1,
        correct: 0,
        percentage: 0,
      });
    });

    it("should handle empty MCQ array", () => {
      const result = ScoreCalculator.calculateObjectivePerformance([], {});
      expect(result).toHaveLength(0);
    });
  });

  describe("identifyAreasToReview", () => {
    it("should return objectives with any incorrect answers", () => {
      const mcqs: MCQ[] = [
        createMockMCQ("q1", "obj-1", 0),
        createMockMCQ("q2", "obj-1", 1),
        createMockMCQ("q3", "obj-2", 2),
      ];
      const userAnswers = { q1: 0, q2: 3, q3: 2 }; // obj-1: 1 wrong, obj-2: all correct
      const objectives: LearningObjective[] = [
        createMockObjective("obj-1", "Introduction"),
        createMockObjective("obj-2", "Advanced Topics"),
      ];

      const result = ScoreCalculator.identifyAreasToReview(mcqs, userAnswers, objectives);

      expect(result).toEqual(["Introduction"]);
    });

    it("should return empty array when all answers are correct", () => {
      const mcqs: MCQ[] = [createMockMCQ("q1", "obj-1", 0), createMockMCQ("q2", "obj-2", 1)];
      const userAnswers = { q1: 0, q2: 1 };
      const objectives: LearningObjective[] = [
        createMockObjective("obj-1", "Introduction"),
        createMockObjective("obj-2", "Advanced Topics"),
      ];

      const result = ScoreCalculator.identifyAreasToReview(mcqs, userAnswers, objectives);

      expect(result).toEqual([]);
    });

    it("should handle missing objectives gracefully", () => {
      const mcqs: MCQ[] = [createMockMCQ("q1", "obj-unknown", 0)];
      const userAnswers = { q1: 3 }; // Wrong answer
      const objectives: LearningObjective[] = [createMockObjective("obj-1", "Introduction")];

      const result = ScoreCalculator.identifyAreasToReview(mcqs, userAnswers, objectives);

      expect(result).toEqual([]); // obj-unknown not found, so not included
    });
  });
});
