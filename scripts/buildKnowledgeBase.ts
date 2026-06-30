/**
 * Builds the knowledge base: reads scratchpad/kb_export.jsonl (produced by
 * exportHistory.ts), embeds each question via Voyage, and upserts the rows into
 * the `kb_qa` Supabase table.
 *
 * Run after applying supabase/kb_schema.sql:
 *   npm run kb:build
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { embedDocuments } from "../src/ai/embeddings";
import { config } from "../src/config";

interface QaRow {
  topic_id: number | null;
  question: string;
  answer: string;
}

const EXPORT_PATH = resolve(__dirname, "../scratchpad/kb_export.jsonl");
const BATCH_SIZE = 128; // Voyage per-request input cap.
// Set KB_FRESH=1 to wipe kb_qa before loading (clean rebuild, avoids dupes).
const FRESH = process.env.KB_FRESH === "1";
// Optional delay between batches (ms) for tight free-tier rate limits.
const BATCH_DELAY_MS = Number(process.env.KB_BATCH_DELAY_MS ?? "0");

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

function loadRows(): QaRow[] {
  const raw = readFileSync(EXPORT_PATH, "utf8");
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as QaRow)
    .filter((r) => r.question?.trim() && r.answer?.trim());
}

async function main(): Promise<void> {
  const rows = loadRows();
  console.log(`Loaded ${rows.length} Q&A pairs from ${EXPORT_PATH}`);
  if (rows.length === 0) return;

  const supabase = createClient(config.supabase.URL, config.supabase.KEY);

  if (FRESH) {
    const { error } = await supabase.from("kb_qa").delete().gte("id", 0);
    if (error) {
      console.error("Failed to clear kb_qa:", error.message);
      process.exit(1);
    }
    console.log("Cleared existing kb_qa rows (KB_FRESH=1)");
  }

  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const embeddings = await embedDocuments(batch.map((r) => r.question));

    const records = batch.map((r, j) => ({
      topic_id: r.topic_id,
      question: r.question,
      answer: r.answer,
      embedding: embeddings[j],
    }));

    const { error } = await supabase.from("kb_qa").insert(records);
    if (error) {
      console.error("Insert failed:", error.message);
      process.exit(1);
    }
    inserted += records.length;
    console.log(`Inserted ${inserted}/${rows.length}`);
    if (BATCH_DELAY_MS > 0 && i + BATCH_SIZE < rows.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log("Knowledge base build complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
