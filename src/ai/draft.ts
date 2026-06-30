import type { SupabaseStore } from "../bot/utils/supabaseStore";
import { config } from "../config";
import { logger } from "../logger";
import { generateDraft, type DraftResult } from "./anthropic";
import { embedQuery } from "./embeddings";
import { retrieve } from "./knowledgeBase";

export interface DraftOutcome {
  draft: string;
  confidence: number;
  /** true when the draft is low-confidence or the model asked for a human. */
  needsHuman: boolean;
  /** true when the user is asking for their own VPN key/config. */
  wantsOwnKey: boolean;
  reason: string;
}

/**
 * End-to-end draft pipeline: embed the question, retrieve similar Q&A from the
 * knowledge base, and ask Claude for a grounded draft. Returns null on failure
 * so the caller can fall back to plain operator handling.
 */
export async function buildDraft(
  supabase: SupabaseStore,
  question: string,
): Promise<DraftOutcome | null> {
  try {
    const queryEmbedding = await embedQuery(question);
    const matches = await retrieve(supabase.raw, queryEmbedding);
    const result: DraftResult = await generateDraft(question, matches);

    const needsHuman =
      result.needs_human || result.confidence < config.ai.CONFIDENCE_THRESHOLD;

    return {
      draft: result.draft_answer,
      confidence: result.confidence,
      needsHuman,
      wantsOwnKey: result.wants_own_key,
      reason: result.reason,
    };
  } catch (e) {
    logger.error({ err: e }, "buildDraft failed");
    return null;
  }
}
