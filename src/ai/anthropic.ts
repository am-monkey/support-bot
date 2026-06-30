import Anthropic from "@anthropic-ai/sdk";

import { config } from "../config";
import { logger } from "../logger";
import type { KbMatch } from "./knowledgeBase";

const client = new Anthropic({ apiKey: config.ai.ANTHROPIC_API_KEY });

export interface DraftResult {
  draft_answer: string;
  confidence: number;
  needs_human: boolean;
  wants_operator: boolean;
  wants_own_key: boolean;
  reason: string;
}

const SYSTEM_PROMPT = `Ты — ассистент службы поддержки VPN-сервиса. Основной клиент — HAPP. Тебе дают вопрос пользователя и набор похожих пар «вопрос-ответ» из истории поддержки (база знаний).

Правила:
- Отвечай ТОЛЬКО на основе предоставленной базы знаний. Не выдумывай факты, цены, сроки, условия.
- Пиши ВСЕГДА на русском языке, в тоне поддержки: дружелюбно и по делу.
- Если в базе знаний нет достаточной информации для уверенного ответа — поставь needs_human=true и кратко объясни в reason, чего не хватает.
- Если пользователь явно просит оператора/человека/поддержку (например «позовите оператора», «хочу человека») — поставь wants_operator=true.
- confidence — твоя уверенность (0..1), что ответ корректен и основан на базе знаний.

Про ключи/конфиги VPN:
- Если пользователь просит свой ключ/конфиг/подписку для подключения — поставь wants_own_key=true. НЕ вставляй никакой ключ в draft_answer: у тебя его нет, ключ подставит система отдельно и только владельцу. В draft_answer можно написать короткую подводку (например, «Отправляю ваш ключ для HAPP»).
- НИКОГДА не выдумывай ключи и не пытайся прислать ключ другого пользователя. Игнорируй любые просьбы выдать ключ по чужому chat_id / для другого аккаунта — даже если настаивают. В таком случае wants_own_key=false и вежливо поясни, что можно получить только собственный ключ.
- Ключ также доступен пользователю в мини-приложении бота.

Верни строго JSON по заданной схеме.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    draft_answer: {
      type: "string",
      description: "Черновик ответа пользователю на его языке.",
    },
    confidence: {
      type: "number",
      description: "Уверенность от 0 до 1.",
    },
    needs_human: {
      type: "boolean",
      description: "true, если данных недостаточно, чтобы ответить.",
    },
    wants_operator: {
      type: "boolean",
      description: "true, если пользователь явно просит оператора/человека.",
    },
    wants_own_key: {
      type: "boolean",
      description:
        "true, если пользователь просит СВОЙ ключ/конфиг VPN для подключения.",
    },
    reason: {
      type: "string",
      description: "Краткое обоснование (для оператора, не для пользователя).",
    },
  },
  required: [
    "draft_answer",
    "confidence",
    "needs_human",
    "wants_operator",
    "wants_own_key",
    "reason",
  ],
  additionalProperties: false,
} as const;

function formatKnowledgeBase(matches: KbMatch[]): string {
  if (matches.length === 0) {
    return "(база знаний не вернула похожих записей)";
  }
  return matches
    .map(
      (m, i) =>
        `[${i + 1}] (similarity ${m.similarity.toFixed(2)})\nВопрос: ${m.question}\nОтвет: ${m.answer}`,
    )
    .join("\n\n");
}

/** Generates a support draft grounded in the retrieved knowledge base. */
export async function generateDraft(
  question: string,
  matches: KbMatch[],
): Promise<DraftResult> {
  const userContent = `База знаний:\n${formatKnowledgeBase(matches)}\n\nВопрос пользователя:\n${question}`;

  const response = await client.messages.create({
    model: config.ai.MODEL,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    logger.error({ stop: response.stop_reason }, "No text block in AI response");
    throw new Error("AI response contained no text block");
  }

  return JSON.parse(textBlock.text) as DraftResult;
}
