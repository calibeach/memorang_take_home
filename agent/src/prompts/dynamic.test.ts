import { describe, it, expect } from "vitest";
import { buildSystemPrompt, getProgressiveHint, type PromptContext } from "./dynamic.js";

describe("buildSystemPrompt", () => {
  describe("quiz prompts", () => {
    it("should return base quiz prompt for basic context", () => {
      const context: PromptContext = { purpose: "quiz" };
      const prompt = buildSystemPrompt(context);

      expect(prompt).toContain("expert quiz creator");
      expect(prompt).toContain("multiple choice questions");
    });

    it("should include question count when provided", () => {
      const context: PromptContext = {
        purpose: "quiz",
        questionsPerObjective: 5,
      };
      const prompt = buildSystemPrompt(context);

      expect(prompt).toContain("exactly 5 multiple choice questions");
    });

    it("should include beginner difficulty modifier", () => {
      const context: PromptContext = {
        purpose: "quiz",
        objectiveDifficulty: "beginner",
      };
      const prompt = buildSystemPrompt(context);

      expect(prompt).toContain("Difficulty Guidance");
      expect(prompt).toContain("simple, accessible language");
    });

    it("should include intermediate difficulty modifier", () => {
      const context: PromptContext = {
        purpose: "quiz",
        objectiveDifficulty: "intermediate",
      };
      const prompt = buildSystemPrompt(context);

      expect(prompt).toContain("Difficulty Guidance");
      expect(prompt).toContain("Balance technical accuracy");
    });

    it("should include advanced difficulty modifier", () => {
      const context: PromptContext = {
        purpose: "quiz",
        objectiveDifficulty: "advanced",
      };
      const prompt = buildSystemPrompt(context);

      expect(prompt).toContain("Difficulty Guidance");
      expect(prompt).toContain("precise technical language");
    });

    it("should include objective title when provided", () => {
      const context: PromptContext = {
        purpose: "quiz",
        objectiveTitle: "Understanding Neural Networks",
      };
      const prompt = buildSystemPrompt(context);

      expect(prompt).toContain("Current Topic");
      expect(prompt).toContain("Understanding Neural Networks");
    });
  });

  describe("critique prompts", () => {
    it("should return base critique prompt", () => {
      const context: PromptContext = { purpose: "critique" };
      const prompt = buildSystemPrompt(context);

      expect(prompt).toContain("educational content reviewer");
      expect(prompt).toContain("Factual Accuracy");
      expect(prompt).toContain("Clarity");
    });
  });

  describe("refine prompts", () => {
    it("should return base refine prompt", () => {
      const context: PromptContext = { purpose: "refine" };
      const prompt = buildSystemPrompt(context);

      expect(prompt).toContain("educational content writer");
      expect(prompt).toContain("improve multiple choice questions");
    });
  });

  describe("feedback prompts", () => {
    it("should return base feedback prompt", () => {
      const context: PromptContext = { purpose: "feedback" };
      const prompt = buildSystemPrompt(context);

      expect(prompt).toContain("supportive educational tutor");
    });

    it("should include first attempt modifier", () => {
      const context: PromptContext = {
        purpose: "feedback",
        attemptCount: 1,
      };
      const prompt = buildSystemPrompt(context);

      expect(prompt).toContain("first attempt");
      expect(prompt).toContain("standard hint");
    });

    it("should include second attempt modifier", () => {
      const context: PromptContext = {
        purpose: "feedback",
        attemptCount: 2,
      };
      const prompt = buildSystemPrompt(context);

      expect(prompt).toContain("second attempt");
      expect(prompt).toContain("more specific hint");
    });

    it("should include struggling student modifier for 3+ attempts", () => {
      const context: PromptContext = {
        purpose: "feedback",
        attemptCount: 3,
      };
      const prompt = buildSystemPrompt(context);

      expect(prompt).toContain("struggling");
      expect(prompt).toContain("explicit guidance");
    });

    it("should include struggling modifier for high attempt counts", () => {
      const context: PromptContext = {
        purpose: "feedback",
        attemptCount: 5,
      };
      const prompt = buildSystemPrompt(context);

      expect(prompt).toContain("struggling");
    });
  });
});

describe("getProgressiveHint", () => {
  const baseHint = "Think about the relationship between X and Y.";

  it("should return base hint for first attempt", () => {
    const hint = getProgressiveHint(baseHint, 1);
    expect(hint).toBe(baseHint);
  });

  it("should provide contextual guidance for second attempt", () => {
    const hint = getProgressiveHint(baseHint, 2);

    // Implementation provides contextual hints that replace base hint
    expect(hint).toContain("Re-read the question");
  });

  it("should provide strong guidance for third+ attempts", () => {
    const hint = getProgressiveHint(baseHint, 3);

    // Implementation provides focused hints for struggling students
    expect(hint).toContain("Focus on the main concept");
  });

  it("should provide maximum hint for high attempt counts", () => {
    const hint = getProgressiveHint(baseHint, 10);

    // Implementation provides final hint for very high attempt counts
    expect(hint).toContain("Final hint");
  });
});
