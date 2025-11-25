import fs from "fs";
import pdfParse from "pdf-parse";
import type { LearningState } from "../state.js";
import { validatePdfContent, truncateContent } from "../utils/helpers.js";
import { CONFIG } from "../config.js";
import {
  logger,
  logAgentThinking,
  logAgentDecision,
  logAgentSuccess,
  logAgentError,
} from "../utils/logger.js";

/**
 * Node that parses PDF content from the uploaded file.
 * Extracts text content for further processing.
 */
export async function pdfParserNode(state: LearningState): Promise<Partial<LearningState>> {
  logger.startSection("PDF Parser Agent");

  const { pdfPath } = state;

  logAgentThinking("PDF Parser", "Checking if PDF path is provided", {
    pdfPath: pdfPath || "none",
  });

  if (!pdfPath) {
    logAgentError("PDF Parser", "No PDF path provided in state");
    logger.endSection();
    return {
      error: "No PDF file provided. Please upload a PDF to begin.",
      currentPhase: "upload",
    };
  }

  try {
    // Check if file exists
    logAgentThinking("PDF Parser", "Verifying file existence", {
      path: pdfPath,
    });

    if (!fs.existsSync(pdfPath)) {
      logAgentError("PDF Parser", "File not found at specified path", {
        attemptedPath: pdfPath,
      });
      logger.endSection();
      return {
        error: `PDF file not found at path: ${pdfPath}`,
        currentPhase: "upload",
      };
    }

    logAgentThinking("PDF Parser", "File exists, preparing to read and parse");

    // Read and parse the PDF
    logger.info("PDF Parser", "Reading PDF file into buffer");
    const dataBuffer = fs.readFileSync(pdfPath);

    logger.info("PDF Parser", "Parsing PDF content");
    const pdfData = await pdfParse(dataBuffer);

    const content = pdfData.text.trim();

    logAgentThinking("PDF Parser", "Analyzing extracted content", {
      rawLength: content.length,
      hasContent: content.length > 0,
    });

    // Validate content using our utility
    logger.info("PDF Parser", "Validating PDF content quality");
    const validation = validatePdfContent(content);

    if (!validation.valid) {
      logAgentDecision("PDF Parser", "Content validation failed", {
        reason: validation.error,
        wordCount: validation.wordCount,
        minRequired: CONFIG.PDF.MIN_WORD_COUNT,
      });
      logger.endSection();
      return {
        error: validation.error,
        currentPhase: "upload",
      };
    }

    logAgentSuccess("PDF Parser", "Content validation passed", {
      wordCount: validation.wordCount,
      characterCount: content.length,
    });

    // Truncate content if needed for token limits
    logAgentThinking("PDF Parser", "Checking if content needs truncation", {
      currentLength: content.length,
      maxAllowed: CONFIG.PDF.MAX_CONTENT_LENGTH,
    });

    const processedContent = truncateContent(content, CONFIG.PDF.MAX_CONTENT_LENGTH);

    if (processedContent.length < content.length) {
      logAgentDecision("PDF Parser", "Content truncated to fit token limits", {
        originalLength: content.length,
        truncatedLength: processedContent.length,
      });
    }

    logAgentSuccess(
      "PDF Parser",
      "PDF successfully processed and ready for learning plan generation",
      {
        finalWordCount: validation.wordCount,
        contentReady: true,
        nextPhase: "planning",
      }
    );

    logger.endSection();

    return {
      pdfContent: processedContent,
      currentPhase: "planning",
      error: null,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logAgentError("PDF Parser", "Unexpected error during PDF processing", {
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
    });
    logger.endSection();
    return {
      error: `Failed to parse PDF: ${errorMessage}`,
      currentPhase: "upload",
    };
  }
}
