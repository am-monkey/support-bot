import type { SupabaseClient } from "@supabase/supabase-js";

import { config } from "../config";
import { logger } from "../logger";

export interface KbMatch {
  question: string;
  answer: string;
  similarity: number;
}

// Personal VPN keys (vless://, trojan://, ...) and per-user subscription links
// (parcer.php?<token>, /krug-sub/<token>, /subbase/<token>).
const VPN_KEY_RE =
  /\b(?:vless|vmess|trojan|ssr?|hysteria2?|hy2|tuic|wireguard|wg):\/\/|parcer\.php\?\S+|:\/\/\S*?\/(?:krug-sub|subbase|sub)\/\S+/i;

/** Whether the text contains a personal VPN key or subscription link. */
export function containsVpnKey(text: string): boolean {
  return VPN_KEY_RE.test(text);
}

/**
 * Retrieves the top-k most similar Q&A pairs from the `kb_qa` table via the
 * `match_kb` RPC (cosine similarity over pgvector embeddings). Pairs holding a
 * personal VPN key are dropped so one user's key never reaches another.
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

  return ((data ?? []) as KbMatch[]).filter(
    (m) => !containsVpnKey(m.question) && !containsVpnKey(m.answer),
  );
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
