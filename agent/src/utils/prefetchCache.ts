/**
 * In-memory cache for prefetched MCQ promises.
 * Stores background generation promises keyed by thread ID.
 */

import type { MCQ } from "../schemas/index.js";

interface PrefetchEntry {
  promise: Promise<MCQ[]>;
  objectiveIdx: number;
}

const cache = new Map<string, PrefetchEntry>();

export const prefetchCache = {
  /**
   * Store a prefetch promise for a thread
   */
  set: (threadId: string, entry: PrefetchEntry): void => {
    cache.set(threadId, entry);
  },

  /**
   * Get a prefetch entry for a thread
   */
  get: (threadId: string): PrefetchEntry | undefined => {
    return cache.get(threadId);
  },

  /**
   * Remove a prefetch entry (cleanup)
   */
  delete: (threadId: string): boolean => {
    return cache.delete(threadId);
  },

  /**
   * Check if a prefetch exists for a thread
   */
  has: (threadId: string): boolean => {
    return cache.has(threadId);
  },

  /**
   * Clear all entries (for testing)
   */
  clear: (): void => {
    cache.clear();
  },
};
