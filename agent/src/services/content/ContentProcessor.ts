import { AI_CONFIG, type AIPurpose } from "../../config/ai.config.js";
import { logAgentDecision } from "../../utils/logger.js";

export interface TruncationResult {
  content: string;
  wasTruncated: boolean;
  originalLength: number;
  truncatedLength: number;
}

/**
 * Service for processing and preparing content for AI consumption.
 */
export class ContentProcessor {
  /**
   * Truncate content to fit within token limits for a specific purpose.
   * @param content - The content to truncate
   * @param purpose - The intended use case (determines truncation limit)
   * @param agentName - Optional agent name for logging
   * @returns Truncation result with content and metadata
   */
  static truncate(content: string, purpose: AIPurpose, agentName?: string): TruncationResult {
    const limit = AI_CONFIG.truncation[purpose];
    const originalLength = content.length;

    if (originalLength <= limit) {
      return {
        content,
        wasTruncated: false,
        originalLength,
        truncatedLength: originalLength,
      };
    }

    const truncatedContent = content.slice(0, limit) + "\n\n[Content truncated for processing...]";

    if (agentName) {
      logAgentDecision(agentName, "Content exceeds token limit, truncating for processing", {
        originalLength,
        truncatedLength: limit,
        preservedPercentage: Math.round((limit / originalLength) * 100),
      });
    }

    return {
      content: truncatedContent,
      wasTruncated: true,
      originalLength,
      truncatedLength: limit,
    };
  }

  /**
   * Validate that content exists and is not empty.
   * @param content - The content to validate
   * @returns True if content is valid
   */
  static isValid(content: string | undefined | null): content is string {
    return typeof content === "string" && content.trim().length > 0;
  }
}
