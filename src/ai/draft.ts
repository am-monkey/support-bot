import type { SupabaseStore } from "../bot/utils/supabaseStore";
import { logger } from "../logger";
import { generateDraft, type DraftResult } from "./anthropic";
import { embedQuery } from "./embeddings";
import { retrieve } from "./knowledgeBase";

export interface DraftOutcome {
  answer: string;
  confidence: number;
  /** Highest cosine similarity among retrieved KB matches (0 if none). */
  topSimilarity: number;
  /** Model could not answer from the knowledge base. */
  needsHuman: boolean;
  /** User explicitly asked for a human/operator. */
  wantsOperator: boolean;
  /** User is asking for their own VPN key/config. */
  wantsOwnKey: boolean;
  reason: string;
}

/**
 * End-to-end pipeline: embed the question, retrieve similar Q&A from the
 * knowledge base, and ask Claude for a grounded answer. Returns null on failure
 * so the caller can fall back to plain operator handling.
 */
export async function buildDraft(
  supabase: SupabaseStore,
  question: string,
): Promise<DraftOutcome | null> {
  try {
    const queryEmbedding = await embedQuery(question);
    const matches = await retrieve(supabase.raw, queryEmbedding);
    const topSimilarity = matches.reduce((m, c) => Math.max(m, c.similarity), 0);
    const result: DraftResult = await generateDraft(question, matches);

    return {
      answer: result.draft_answer,
      confidence: result.confidence,
      topSimilarity,
      needsHuman: result.needs_human,
      wantsOperator: result.wants_operator,
      wantsOwnKey: result.wants_own_key,
      reason: result.reason,
    };
  } catch (e) {
    logger.error({ err: e }, "buildDraft failed");
    return null;
  }
}
