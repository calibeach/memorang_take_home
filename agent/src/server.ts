import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { graph } from "./graph.js";
import { Command } from "@langchain/langgraph";
import { CONFIG, validateConfig } from "./config.js";
import { generateId } from "./utils/helpers.js";
import { ValidationError, normalizeError } from "./utils/errors.js";
import { InterruptHandler } from "./services/index.js";
import { askStudyBuddy, type StudyBuddyContext } from "./agents/studyBuddy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate configuration on startup
try {
  validateConfig();
} catch (error) {
  console.error("[Server] Configuration error:", error);
  process.exit(1);
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", CONFIG.UPLOAD.DIR);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const filename = generateId(CONFIG.UPLOAD.FILE_PREFIX) + path.extname(file.originalname);
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new ValidationError("Only PDF files are allowed"));
    }
  },
  limits: {
    fileSize: CONFIG.UPLOAD.MAX_FILE_SIZE,
  },
});

const app = express();

// Middleware
app.use(
  cors({
    origin: CONFIG.CORS.ORIGINS,
    credentials: CONFIG.CORS.CREDENTIALS,
  })
);
app.use(express.json({ limit: "1mb" }));

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * Upload PDF and create a new learning session
 */
app.post("/api/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file provided" });
    }

    const threadId = generateId("thread");

    console.log(`[Server] Created new thread: ${threadId}`);
    console.log(`[Server] PDF uploaded: ${req.file.path}`);

    res.json({
      threadId,
      pdfPath: req.file.path,
      message: "PDF uploaded successfully",
    });
  } catch (error) {
    console.error("[Server] Upload error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Upload failed",
    });
  }
});

/**
 * Start or continue the learning workflow
 */
app.post("/api/threads/:threadId/invoke", async (req, res) => {
  const { threadId } = req.params;
  const { pdfPath, resumeValue } = req.body;

  console.log(`[Server] Invoke called for thread: ${threadId}`);

  try {
    const config = {
      configurable: {
        thread_id: threadId,
      },
    };

    let result;

    if (resumeValue !== undefined) {
      // Resume from an interrupt
      console.log(`[Server] Resuming with value:`, resumeValue);
      // Convert numeric values to strings to avoid falsy issues with 0
      const safeResumeValue = typeof resumeValue === "number" ? String(resumeValue) : resumeValue;
      result = await graph.invoke(new Command({ resume: safeResumeValue }), config);
    } else if (pdfPath) {
      // Start new workflow with PDF
      console.log(`[Server] Starting new workflow with PDF: ${pdfPath}`);
      result = await graph.invoke(
        {
          pdfPath,
          currentPhase: "upload",
        },
        config
      );
    } else {
      // Continue existing workflow
      console.log(`[Server] Continuing existing workflow`);
      result = await graph.invoke(null, config);
    }

    // Check for interrupts using InterruptHandler service
    const state = await graph.getState(config);
    const { isInterrupted, interruptData: rawInterruptData } = InterruptHandler.check(state.tasks);
    // Unwrap the 'value' property from LangGraph interrupt structure
    // LangGraph wraps interrupt data as { value: {...}, when, resumable, ns }
    // but the frontend expects the flat structure directly
    const interruptData = (rawInterruptData as { value?: unknown })?.value ?? rawInterruptData;

    if (isInterrupted) {
      console.log(`[Server] Workflow interrupted:`, interruptData);

      return res.json({
        state: result,
        interrupted: true,
        interruptData,
      });
    }

    console.log(`[Server] Workflow completed, phase: ${result.currentPhase}`);

    res.json({
      state: result,
      interrupted: false,
    });
  } catch (error) {
    console.error("[Server] Invoke error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Workflow execution failed",
    });
  }
});

/**
 * Get current state of a thread
 */
app.get("/api/threads/:threadId/state", async (req, res) => {
  const { threadId } = req.params;

  try {
    const config = {
      configurable: {
        thread_id: threadId,
      },
    };

    const state = await graph.getState(config);

    res.json({
      state: state.values,
      next: state.next,
    });
  } catch (error) {
    console.error("[Server] Get state error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get state",
    });
  }
});

/**
 * Submit an answer to a question
 */
app.post("/api/threads/:threadId/answer", async (req, res) => {
  const { threadId } = req.params;
  const { questionId, answer } = req.body;

  console.log(
    `[Server] Answer submitted for thread ${threadId}: question=${questionId}, answer=${answer}`
  );

  try {
    const config = {
      configurable: {
        thread_id: threadId,
      },
    };

    // Resume the workflow with the answer
    const result = await graph.invoke(new Command({ resume: answer }), config);

    // Check for more interrupts using InterruptHandler service
    const state = await graph.getState(config);
    const { isInterrupted, interruptData: rawInterruptData } = InterruptHandler.check(state.tasks);
    // Unwrap the 'value' property from LangGraph interrupt structure
    const interruptData = (rawInterruptData as { value?: unknown })?.value ?? rawInterruptData;

    if (isInterrupted) {
      return res.json({
        state: result,
        interrupted: true,
        interruptData,
      });
    }

    res.json({
      state: result,
      interrupted: false,
    });
  } catch (error) {
    console.error("[Server] Answer error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to process answer",
    });
  }
});

/**
 * Ask the Study Buddy agent for help (LangChain v1 Middleware Demo)
 *
 * This endpoint demonstrates LangChain v1's middleware pattern:
 * - beforeModel: Context injection middleware dynamically builds prompts
 * - afterModel: Guardrails middleware validates educational appropriateness
 *
 * The Study Buddy runs alongside the main LangGraph workflow, providing
 * on-demand help without disrupting the quiz flow.
 */
app.post("/api/threads/:threadId/ask", async (req, res) => {
  const { threadId } = req.params;
  const { question, userExpertise = "beginner", recentMessages } = req.body;

  console.log(`[Server] Study Buddy question for thread ${threadId}`);
  if (recentMessages?.length) {
    console.log(`[Server] Received ${recentMessages.length} recent messages for context`);
  }

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    // Get current state from the main LangGraph workflow
    const config = {
      configurable: { thread_id: threadId },
    };
    const state = await graph.getState(config);
    const values = state.values || {};

    // Build context from current learning state
    const context: StudyBuddyContext = {
      threadId,
      userExpertise: userExpertise as "beginner" | "intermediate" | "advanced",
      attemptCount: 0,
      recentMessages: recentMessages as
        | Array<{ role: "user" | "assistant"; content: string }>
        | undefined,
    };

    // Add PDF content if available (truncated for context window)
    if (values.pdfContent) {
      context.pdfContent = values.pdfContent.slice(0, 3000);
    }

    // Add current objective if in quiz phase
    if (values.learningObjectives && values.currentObjectiveIdx !== undefined) {
      const objective = values.learningObjectives[values.currentObjectiveIdx];
      if (objective) {
        context.currentObjective = {
          title: objective.title,
          description: objective.description,
        };
      }
    }

    // Add current MCQ for guardrails (prevents answer reveals)
    if (values.mcqs && values.currentMcqIdx !== undefined) {
      const mcq = values.mcqs[values.currentMcqIdx];
      if (mcq) {
        // Get user's selected answer if they've answered this question
        const userSelectedAnswer = values.userAnswers?.[mcq.id];

        context.currentMcq = {
          question: mcq.question,
          options: mcq.options,
          correctAnswer: mcq.correctAnswer,
          userSelectedAnswer,
        };
        context.attemptCount = values.attemptCounts?.[mcq.id] || 0;
      }
    }

    // Invoke Study Buddy agent with middleware pipeline
    const response = await askStudyBuddy(question, context);

    res.json({
      response,
      middlewareApplied: ["ContextInjectionMiddleware", "EducationalGuardrailsMiddleware"],
      context: {
        hasObjective: !!context.currentObjective,
        hasQuestion: !!context.currentMcq,
        expertise: context.userExpertise,
      },
    });
  } catch (error) {
    console.error("[Server] Study Buddy error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Study Buddy request failed",
    });
  }
});

// Error handling middleware
app.use(
  (err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const error = normalizeError(err);

    console.error("[Server] Error:", {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      path: req.path,
      method: req.method,
    });

    res.status(error.statusCode).json({
      error: {
        message: error.message,
        type: error.name,
        ...(CONFIG.NODE_ENV === "development" && { stack: error.stack }),
      },
    });
  }
);

// Start server
const PORT = CONFIG.PORT;

app.listen(PORT, () => {
  console.log(`\n🚀 Learning Agent Server running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /api/upload - Upload a PDF`);
  console.log(`  POST /api/threads/:threadId/invoke - Start/continue workflow`);
  console.log(`  GET  /api/threads/:threadId/state - Get current state`);
  console.log(`  POST /api/threads/:threadId/answer - Submit an answer`);
  console.log(`  POST /api/threads/:threadId/ask - Study Buddy (Middleware Demo)`);
  console.log(`  GET  /health - Health check\n`);
});
