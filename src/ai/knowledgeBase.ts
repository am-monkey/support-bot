import type { SupabaseClient } from "@supabase/supabase-js";

import { config } from "../config";
import { logger } from "../logger";

export interface KbMatch {
  question: string;
  answer: string;
  similarity: number;
}

/**
 * Retrieves the top-k most similar Q&A pairs from the `kb_qa` table via the
 * `match_kb` RPC (cosine similarity over pgvector embeddings).
 */
export async function retrieve(
  client: SupabaseClient,
  queryEmbedding: number[],
): Promise<KbMatch[]> {
  const { data, error } = await client.rpc("match_kb", {
    query_embedding: queryEmbedding,
    match_count: config.ai.TOP_K,
    match_threshold: config.ai.MATCH_THRESHOLD,
  });

  if (error) {
    logger.error({ err: error }, "match_kb RPC failed");
    return [];
  }

  return (data ?? []) as KbMatch[];
}

/** Inserts a single Q&A pair with its embedding (used for self-learning). */
export async function insertQa(
  client: SupabaseClient,
  topicId: number | null,
  question: string,
  answer: string,
  embedding: number[],
): Promise<void> {
  const { error } = await client.from("kb_qa").insert({
    topic_id: topicId,
    question,
    answer,
    embedding,
  });
  if (error) {
    logger.error({ err: error }, "kb_qa insert failed");
  }
}
