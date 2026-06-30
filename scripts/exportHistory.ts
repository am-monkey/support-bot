/**
 * Exports the support supergroup's per-topic history into Q&A pairs for the
 * knowledge base, via the MTProto (user) API — the Bot API cannot read history.
 *
 * In each forum topic, forwarded messages are user questions and native
 * (non-forwarded, non-bot) messages are operator answers. Consecutive operator
 * messages following a question are merged into one answer.
 *
 * Setup: get api_id/api_hash at https://my.telegram.org, then:
 *   TG_API_ID=... TG_API_HASH=... TG_GROUP_ID=-100... npm run export:history
 * First run prompts for phone/code and prints a TG_SESSION string to reuse.
 * Optionally set TG_BOT_ID to exclude the bot's own messages from answers.
 *
 * Output: scratchpad/kb_export.jsonl
 */
import "dotenv/config";

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import input from "input";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

const OUT_PATH = resolve(__dirname, "../scratchpad/kb_export.jsonl");

interface QaPair {
  topic_id: number;
  question: string;
  answer: string;
  ts: number;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function getClient(): Promise<TelegramClient> {
  const apiId = Number(requireEnv("TG_API_ID"));
  const apiHash = requireEnv("TG_API_HASH");
  const session = new StringSession(process.env.TG_SESSION ?? "");

  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: () => input.text("Phone number: "),
    password: () => input.text("2FA password (if any): "),
    phoneCode: () => input.text("Login code: "),
    onError: (err) => console.error(err),
  });

  if (!process.env.TG_SESSION) {
    console.log("\nSave this as TG_SESSION to skip login next time:\n");
    console.log(client.session.save());
    console.log("");
  }
  return client;
}

/** Lists all forum topics (paginated). */
async function listTopics(
  client: TelegramClient,
  channel: Api.TypeInputPeer,
): Promise<{ id: number; title: string }[]> {
  const topics: { id: number; title: string }[] = [];
  let offsetDate = 0;
  let offsetId = 0;
  let offsetTopic = 0;

  for (;;) {
    const res = (await client.invoke(
      new Api.channels.GetForumTopics({
        channel,
        limit: 100,
        offsetDate,
        offsetId,
        offsetTopic,
      }),
    )) as Api.messages.ForumTopics;

    const page = res.topics.filter(
      (t): t is Api.ForumTopic => t instanceof Api.ForumTopic,
    );
    if (page.length === 0) break;

    for (const t of page) topics.push({ id: t.id, title: t.title });

    const last = page[page.length - 1];
    offsetTopic = last.id;
    offsetId = last.topMessage;
    offsetDate = last.date;
    if (page.length < 100) break;
  }
  return topics;
}

async function exportTopic(
  client: TelegramClient,
  channel: Api.TypeInputPeer,
  topicId: number,
  botId: number | null,
): Promise<QaPair[]> {
  const messages: Api.Message[] = [];
  for await (const msg of client.iterMessages(channel, { replyTo: topicId })) {
    if (msg instanceof Api.Message && msg.message) messages.push(msg);
  }
  messages.reverse(); // chronological

  const pairs: QaPair[] = [];
  let question: string | null = null;
  let answerParts: string[] = [];
  let answerTs = 0;

  const flush = () => {
    if (question && answerParts.length > 0) {
      pairs.push({
        topic_id: topicId,
        question,
        answer: answerParts.join("\n"),
        ts: answerTs,
      });
    }
  };

  for (const msg of messages) {
    const text = msg.message.trim();
    if (!text) continue;
    const isForwarded = msg.fwdFrom != null;
    const senderId = msg.senderId ? Number(msg.senderId.toString()) : null;
    const isBot = botId != null && senderId === botId;

    if (isForwarded) {
      // New user question starts a new turn once an answer exists.
      if (answerParts.length > 0) {
        flush();
        question = text;
        answerParts = [];
      } else {
        question = question ? `${question}\n${text}` : text;
      }
    } else if (!isBot && question) {
      answerParts.push(text);
      answerTs = msg.date;
    }
  }
  flush();
  return pairs;
}

async function main(): Promise<void> {
  const client = await getClient();
  const channel = await client.getInputEntity(requireEnv("TG_GROUP_ID"));
  const botId = process.env.TG_BOT_ID ? Number(process.env.TG_BOT_ID) : null;

  const topics = await listTopics(client, channel);
  console.log(`Found ${topics.length} topics`);

  const all: QaPair[] = [];
  for (const topic of topics) {
    const pairs = await exportTopic(client, channel, topic.id, botId);
    console.log(`Topic "${topic.title}" (${topic.id}): ${pairs.length} pairs`);
    all.push(...pairs);
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, all.map((p) => JSON.stringify(p)).join("\n"));
  console.log(`\nWrote ${all.length} Q&A pairs to ${OUT_PATH}`);

  await client.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
