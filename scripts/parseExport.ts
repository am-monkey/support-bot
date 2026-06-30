/**
 * Parses a Telegram Desktop "Export chat history" JSON dump into Q&A pairs for
 * the knowledge base — no MTProto login required.
 *
 * In the support group, forwarded messages are user questions and native
 * (non-forwarded, non-bot) messages are operator answers. Consecutive operator
 * messages following a question are merged into one answer.
 *
 * Usage:
 *   1. Telegram Desktop → support group → ⋮ → Export chat history → format JSON.
 *   2. Put result.json at scratchpad/result.json (or pass a path as an argument).
 *   3. npm run kb:parse   (then npm run kb:build)
 *
 * Output: scratchpad/kb_export.jsonl
 *
 * Optional: set TG_BOT_NAME to the bot's display name to exclude its messages.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const IN_PATH = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(__dirname, "../scratchpad/result.json");
const OUT_PATH = resolve(__dirname, "../scratchpad/kb_export.jsonl");
const BOT_NAME = process.env.TG_BOT_NAME ?? null;

interface TextEntity {
  type: string;
  text: string;
}
interface RawMessage {
  type: string;
  date_unixtime?: string;
  from?: string | null;
  forwarded_from?: string | null;
  text?: string | TextEntity[];
  text_entities?: TextEntity[];
}
interface Export {
  messages: RawMessage[];
}

interface QaPair {
  topic_id: number | null;
  question: string;
  answer: string;
  ts: number;
}

/** Flattens Telegram's text field (string or array of entity parts) to plain text. */
function plainText(msg: RawMessage): string {
  const t = msg.text;
  if (typeof t === "string") return t.trim();
  if (Array.isArray(t)) {
    return t
      .map((p) => (typeof p === "string" ? p : p.text))
      .join("")
      .trim();
  }
  return "";
}

function main(): void {
  const data = JSON.parse(readFileSync(IN_PATH, "utf8")) as Export;
  const messages = (data.messages ?? []).filter((m) => m.type === "message");

  const pairs: QaPair[] = [];
  let question: string | null = null;
  let answerParts: string[] = [];
  let answerTs = 0;

  const flush = () => {
    if (question && answerParts.length > 0) {
      pairs.push({
        topic_id: null,
        question,
        answer: answerParts.join("\n"),
        ts: answerTs,
      });
    }
  };

  for (const msg of messages) {
    const text = plainText(msg);
    if (!text) continue;

    const isForwarded = msg.forwarded_from != null;
    const isBot = BOT_NAME != null && msg.from === BOT_NAME;
    const ts = Number(msg.date_unixtime ?? 0);

    if (isForwarded) {
      if (answerParts.length > 0) {
        flush();
        question = text;
        answerParts = [];
      } else {
        question = question ? `${question}\n${text}` : text;
      }
    } else if (!isBot && question) {
      answerParts.push(text);
      answerTs = ts;
    }
  }
  flush();

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, pairs.map((p) => JSON.stringify(p)).join("\n"));
  console.log(`Parsed ${messages.length} messages → ${pairs.length} Q&A pairs`);
  console.log(`Wrote ${OUT_PATH}`);
}

main();
