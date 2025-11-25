import { describe, it, expect } from "vitest";
import { InterruptHandler } from "./InterruptHandler.js";

describe("InterruptHandler", () => {
  describe("hasInterrupt", () => {
    it("should return true when a task has interrupts", () => {
      const tasks = [{ interrupts: [] }, { interrupts: [{ type: "approval", data: "test" }] }];

      expect(InterruptHandler.hasInterrupt(tasks)).toBe(true);
    });

    it("should return false when no tasks have interrupts", () => {
      const tasks = [{ interrupts: [] }, { interrupts: [] }];

      expect(InterruptHandler.hasInterrupt(tasks)).toBe(false);
    });

    it("should return false for empty task array", () => {
      expect(InterruptHandler.hasInterrupt([])).toBe(false);
    });

    it("should return false when interrupts property is undefined", () => {
      const tasks = [{ interrupts: undefined }, {}];

      expect(InterruptHandler.hasInterrupt(tasks)).toBe(false);
    });
  });

  describe("getInterruptData", () => {
    it("should return the first interrupt data", () => {
      const interruptData = { type: "approval", plan: [{ id: "1" }] };
      const tasks = [{ interrupts: [] }, { interrupts: [interruptData, { type: "other" }] }];

      expect(InterruptHandler.getInterruptData(tasks)).toEqual(interruptData);
    });

    it("should return null when no interrupts exist", () => {
      const tasks = [{ interrupts: [] }];

      expect(InterruptHandler.getInterruptData(tasks)).toBeNull();
    });

    it("should return null for empty task array", () => {
      expect(InterruptHandler.getInterruptData([])).toBeNull();
    });
  });

  describe("check", () => {
    it("should return combined result with interrupt present", () => {
      const interruptData = { type: "answer_mcq", questionId: "q1" };
      const tasks = [{ interrupts: [interruptData] }];

      const result = InterruptHandler.check(tasks);

      expect(result.isInterrupted).toBe(true);
      expect(result.interruptData).toEqual(interruptData);
    });

    it("should return combined result without interrupt", () => {
      const tasks = [{ interrupts: [] }];

      const result = InterruptHandler.check(tasks);

      expect(result.isInterrupted).toBe(false);
      expect(result.interruptData).toBeNull();
    });
  });
});
