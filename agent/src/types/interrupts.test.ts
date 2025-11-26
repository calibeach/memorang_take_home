import { describe, it, expect } from "vitest";
import {
  isPlanApprovalInterrupt,
  isAnswerMCQInterrupt,
  isKnownInterrupt,
  type PlanApprovalInterrupt,
  type AnswerMCQInterrupt,
} from "./interrupts.js";

describe("isPlanApprovalInterrupt", () => {
  it("should return true for valid plan approval interrupt", () => {
    const interrupt: PlanApprovalInterrupt = {
      type: "plan_approval",
      message: "Please approve the learning plan",
      plan: [
        {
          id: "obj-1",
          title: "Test Objective",
          description: "A test objective",
          difficulty: "easy",
        },
      ],
    };

    expect(isPlanApprovalInterrupt(interrupt)).toBe(true);
  });

  it("should return false for answer_mcq interrupt", () => {
    const interrupt: AnswerMCQInterrupt = {
      type: "answer_mcq",
      questionId: "q-1",
      objectiveId: "obj-1",
      question: "What is 2+2?",
      options: ["2", "3", "4", "5"],
      correctAnswer: 2,
      hint: "Think about basic arithmetic",
      explanation: "2+2=4",
      currentIndex: 0,
      totalQuestions: 5,
      attemptCount: 1,
    };

    expect(isPlanApprovalInterrupt(interrupt)).toBe(false);
  });

  it("should return false for null", () => {
    expect(isPlanApprovalInterrupt(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isPlanApprovalInterrupt(undefined)).toBe(false);
  });

  it("should return false for non-object types", () => {
    expect(isPlanApprovalInterrupt("string")).toBe(false);
    expect(isPlanApprovalInterrupt(123)).toBe(false);
    expect(isPlanApprovalInterrupt(true)).toBe(false);
  });

  it("should return false for object with wrong type field", () => {
    const interrupt = {
      type: "wrong_type",
      message: "test",
      plan: [],
    };

    expect(isPlanApprovalInterrupt(interrupt)).toBe(false);
  });

  it("should return false for object without plan array", () => {
    const interrupt = {
      type: "plan_approval",
      message: "test",
      plan: "not an array",
    };

    expect(isPlanApprovalInterrupt(interrupt)).toBe(false);
  });
});

describe("isAnswerMCQInterrupt", () => {
  it("should return true for valid answer MCQ interrupt", () => {
    const interrupt: AnswerMCQInterrupt = {
      type: "answer_mcq",
      questionId: "q-1",
      objectiveId: "obj-1",
      question: "What is 2+2?",
      options: ["2", "3", "4", "5"],
      correctAnswer: 2,
      hint: "Think about basic arithmetic",
      explanation: "2+2=4",
      currentIndex: 0,
      totalQuestions: 5,
      attemptCount: 1,
    };

    expect(isAnswerMCQInterrupt(interrupt)).toBe(true);
  });

  it("should return false for plan approval interrupt", () => {
    const interrupt: PlanApprovalInterrupt = {
      type: "plan_approval",
      message: "Please approve",
      plan: [],
    };

    expect(isAnswerMCQInterrupt(interrupt)).toBe(false);
  });

  it("should return false for null", () => {
    expect(isAnswerMCQInterrupt(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isAnswerMCQInterrupt(undefined)).toBe(false);
  });

  it("should return false for object with missing required fields", () => {
    const interrupt = {
      type: "answer_mcq",
      questionId: "q-1",
      // missing question, options
    };

    expect(isAnswerMCQInterrupt(interrupt)).toBe(false);
  });

  it("should return false for object with wrong types", () => {
    const interrupt = {
      type: "answer_mcq",
      questionId: 123, // should be string
      question: "test",
      options: "not an array",
    };

    expect(isAnswerMCQInterrupt(interrupt)).toBe(false);
  });
});

describe("isKnownInterrupt", () => {
  it("should return true for plan approval interrupt", () => {
    const interrupt: PlanApprovalInterrupt = {
      type: "plan_approval",
      message: "test",
      plan: [],
    };

    expect(isKnownInterrupt(interrupt)).toBe(true);
  });

  it("should return true for answer MCQ interrupt", () => {
    const interrupt: AnswerMCQInterrupt = {
      type: "answer_mcq",
      questionId: "q-1",
      objectiveId: "obj-1",
      question: "What is 2+2?",
      options: ["2", "3", "4", "5"],
      correctAnswer: 2,
      hint: "hint",
      explanation: "explanation",
      currentIndex: 0,
      totalQuestions: 5,
      attemptCount: 1,
    };

    expect(isKnownInterrupt(interrupt)).toBe(true);
  });

  it("should return false for unknown interrupt types", () => {
    const interrupt = {
      type: "unknown_type",
      data: "some data",
    };

    expect(isKnownInterrupt(interrupt)).toBe(false);
  });

  it("should return false for null", () => {
    expect(isKnownInterrupt(null)).toBe(false);
  });
});
