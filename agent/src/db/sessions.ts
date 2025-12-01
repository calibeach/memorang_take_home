/**
 * Session metadata CRUD operations.
 * Tracks learning sessions outside of LangGraph checkpoints.
 */

import { pool } from "./index.js";

export interface LearningSession {
  id: string;
  thread_id: string;
  pdf_filename: string | null;
  status: "active" | "completed" | "abandoned";
  objectives_count: number;
  correct_answers: number;
  total_questions: number;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

/**
 * Create a new learning session record.
 */
export async function createSession(
  threadId: string,
  pdfFilename: string | null
): Promise<LearningSession> {
  const result = await pool.query<LearningSession>(
    `INSERT INTO learning_sessions (thread_id, pdf_filename)
     VALUES ($1, $2)
     RETURNING *`,
    [threadId, pdfFilename]
  );
  return result.rows[0];
}

/**
 * Get a session by thread ID.
 */
export async function getSessionByThreadId(threadId: string): Promise<LearningSession | null> {
  const result = await pool.query<LearningSession>(
    `SELECT * FROM learning_sessions WHERE thread_id = $1`,
    [threadId]
  );
  return result.rows[0] || null;
}

/**
 * Update session progress (objectives count, questions, etc).
 */
export async function updateSessionProgress(
  threadId: string,
  updates: {
    objectivesCount?: number;
    correctAnswers?: number;
    totalQuestions?: number;
  }
): Promise<LearningSession | null> {
  const setClauses: string[] = ["updated_at = NOW()"];
  const values: (string | number)[] = [];
  let paramIndex = 1;

  if (updates.objectivesCount !== undefined) {
    setClauses.push(`objectives_count = $${paramIndex++}`);
    values.push(updates.objectivesCount);
  }
  if (updates.correctAnswers !== undefined) {
    setClauses.push(`correct_answers = $${paramIndex++}`);
    values.push(updates.correctAnswers);
  }
  if (updates.totalQuestions !== undefined) {
    setClauses.push(`total_questions = $${paramIndex++}`);
    values.push(updates.totalQuestions);
  }

  values.push(threadId);

  const result = await pool.query<LearningSession>(
    `UPDATE learning_sessions
     SET ${setClauses.join(", ")}
     WHERE thread_id = $${paramIndex}
     RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

/**
 * Mark a session as completed.
 */
export async function completeSession(
  threadId: string,
  finalStats: {
    correctAnswers: number;
    totalQuestions: number;
  }
): Promise<LearningSession | null> {
  const result = await pool.query<LearningSession>(
    `UPDATE learning_sessions
     SET status = 'completed',
         correct_answers = $1,
         total_questions = $2,
         completed_at = NOW(),
         updated_at = NOW()
     WHERE thread_id = $3
     RETURNING *`,
    [finalStats.correctAnswers, finalStats.totalQuestions, threadId]
  );
  return result.rows[0] || null;
}

/**
 * Mark a session as abandoned (for cleanup purposes).
 */
export async function abandonSession(threadId: string): Promise<LearningSession | null> {
  const result = await pool.query<LearningSession>(
    `UPDATE learning_sessions
     SET status = 'abandoned', updated_at = NOW()
     WHERE thread_id = $1
     RETURNING *`,
    [threadId]
  );
  return result.rows[0] || null;
}

/**
 * Get session statistics (for potential future analytics endpoint).
 */
export async function getSessionStats(): Promise<{
  total: number;
  active: number;
  completed: number;
  avgScore: number | null;
}> {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'active') as active,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      AVG(
        CASE
          WHEN total_questions > 0
          THEN (correct_answers::float / total_questions * 100)
          ELSE NULL
        END
      ) FILTER (WHERE status = 'completed') as avg_score
    FROM learning_sessions
  `);

  const row = result.rows[0];
  return {
    total: parseInt(row.total, 10),
    active: parseInt(row.active, 10),
    completed: parseInt(row.completed, 10),
    avgScore: row.avg_score ? parseFloat(row.avg_score) : null,
  };
}
