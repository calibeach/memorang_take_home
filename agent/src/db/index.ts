/**
 * Database connection pool for session metadata.
 * Uses pg Pool for connection management.
 */

import { Pool } from "pg";
import { CONFIG } from "../config.js";

// Create a connection pool
export const pool = new Pool({
  connectionString: CONFIG.DATABASE_URL,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Timeout after 5 seconds if can't connect
});

// Log pool errors
pool.on("error", (err) => {
  console.error("[Database] Unexpected pool error:", err);
});

/**
 * Initialize the sessions table if it doesn't exist.
 */
export async function initializeSessionsTable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS learning_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id VARCHAR(255) UNIQUE NOT NULL,
        pdf_filename VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        objectives_count INTEGER DEFAULT 0,
        correct_answers INTEGER DEFAULT 0,
        total_questions INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_thread_id ON learning_sessions(thread_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON learning_sessions(status);
    `);
    console.log("[Database] Sessions table initialized");
  } finally {
    client.release();
  }
}

/**
 * Close all database connections.
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log("[Database] Connection pool closed");
}

// Re-export sessions module
export * from "./sessions.js";
