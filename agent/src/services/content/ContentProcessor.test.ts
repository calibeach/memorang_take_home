import { describe, it, expect, vi } from "vitest";
import { ContentProcessor } from "./ContentProcessor.js";
import { AI_CONFIG } from "../../config/ai.config.js";

// Mock the logger to prevent console output during tests
vi.mock("../../utils/logger.js", () => ({
  logAgentDecision: vi.fn(),
}));

describe("ContentProcessor", () => {
  describe("truncate", () => {
    it("should not truncate content within limits", () => {
      const shortContent = "This is short content.";

      const result = ContentProcessor.truncate(shortContent, "planning");

      expect(result.wasTruncated).toBe(false);
      expect(result.content).toBe(shortContent);
      expect(result.originalLength).toBe(shortContent.length);
      expect(result.truncatedLength).toBe(shortContent.length);
    });

    it("should truncate content exceeding limits", () => {
      // Create content longer than the planning limit
      const longContent = "x".repeat(AI_CONFIG.truncation.planning + 1000);

      const result = ContentProcessor.truncate(longContent, "planning");

      expect(result.wasTruncated).toBe(true);
      expect(result.originalLength).toBe(longContent.length);
      expect(result.truncatedLength).toBe(AI_CONFIG.truncation.planning);
      expect(result.content).toContain("[Content truncated for processing...]");
    });

    it("should use correct limits for different purposes", () => {
      const longContent = "x".repeat(10000);

      // Planning has the largest limit
      const planningResult = ContentProcessor.truncate(longContent, "planning");
      expect(planningResult.truncatedLength).toBe(AI_CONFIG.truncation.planning);

      // Quiz has a medium limit
      const quizResult = ContentProcessor.truncate(longContent, "quiz");
      expect(quizResult.truncatedLength).toBe(AI_CONFIG.truncation.quiz);

      // Summary has the smallest limit
      const summaryResult = ContentProcessor.truncate(longContent, "summary");
      expect(summaryResult.truncatedLength).toBe(AI_CONFIG.truncation.summary);
    });

    it("should handle exact limit content", () => {
      const exactContent = "x".repeat(AI_CONFIG.truncation.summary);

      const result = ContentProcessor.truncate(exactContent, "summary");

      expect(result.wasTruncated).toBe(false);
      expect(result.content).toBe(exactContent);
    });

    it("should handle empty content", () => {
      const result = ContentProcessor.truncate("", "planning");

      expect(result.wasTruncated).toBe(false);
      expect(result.content).toBe("");
      expect(result.originalLength).toBe(0);
    });
  });

  describe("isValid", () => {
    it("should return true for valid string content", () => {
      expect(ContentProcessor.isValid("Hello")).toBe(true);
      expect(ContentProcessor.isValid("  content  ")).toBe(true);
    });

    it("should return false for empty string", () => {
      expect(ContentProcessor.isValid("")).toBe(false);
    });

    it("should return false for whitespace-only string", () => {
      expect(ContentProcessor.isValid("   ")).toBe(false);
      expect(ContentProcessor.isValid("\n\t")).toBe(false);
    });

    it("should return false for null", () => {
      expect(ContentProcessor.isValid(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(ContentProcessor.isValid(undefined)).toBe(false);
    });
  });
});
