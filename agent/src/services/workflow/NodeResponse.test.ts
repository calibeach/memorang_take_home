import { describe, it, expect } from "vitest";
import { NodeResponse } from "./NodeResponse.js";

describe("NodeResponse", () => {
  describe("error", () => {
    it("should create error response with default phase", () => {
      const result = NodeResponse.error("Something went wrong");

      expect(result.error).toBe("Something went wrong");
      expect(result.currentPhase).toBe("upload");
    });

    it("should create error response with custom phase", () => {
      const result = NodeResponse.error("Quiz error", "quiz");

      expect(result.error).toBe("Quiz error");
      expect(result.currentPhase).toBe("quiz");
    });
  });

  describe("success", () => {
    it("should create success response with updates", () => {
      const updates = {
        pdfContent: "Some content",
        learningObjectives: [],
      };

      const result = NodeResponse.success(updates);

      expect(result.pdfContent).toBe("Some content");
      expect(result.learningObjectives).toEqual([]);
      expect(result.error).toBeNull();
    });

    it("should include phase when provided", () => {
      const result = NodeResponse.success({ pdfContent: "test" }, "planning");

      expect(result.pdfContent).toBe("test");
      expect(result.currentPhase).toBe("planning");
      expect(result.error).toBeNull();
    });

    it("should not include phase when not provided", () => {
      const result = NodeResponse.success({ pdfContent: "test" });

      expect(result.pdfContent).toBe("test");
      expect(result.currentPhase).toBeUndefined();
      expect(result.error).toBeNull();
    });
  });

  describe("extractErrorMessage", () => {
    it("should extract message from Error instance", () => {
      const error = new Error("Test error message");

      expect(NodeResponse.extractErrorMessage(error)).toBe("Test error message");
    });

    it("should return 'Unknown error' for non-Error values", () => {
      expect(NodeResponse.extractErrorMessage("string error")).toBe("Unknown error");
      expect(NodeResponse.extractErrorMessage(null)).toBe("Unknown error");
      expect(NodeResponse.extractErrorMessage(undefined)).toBe("Unknown error");
      expect(NodeResponse.extractErrorMessage(42)).toBe("Unknown error");
      expect(NodeResponse.extractErrorMessage({ message: "object" })).toBe("Unknown error");
    });

    it("should handle custom Error subclasses", () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }

      const error = new CustomError("Custom message");
      expect(NodeResponse.extractErrorMessage(error)).toBe("Custom message");
    });
  });
});
