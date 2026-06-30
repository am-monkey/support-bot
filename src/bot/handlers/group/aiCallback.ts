import { GrammyError } from "grammy";

import { embedDocuments } from "../../../ai/embeddings";
import { insertQa } from "../../../ai/knowledgeBase";
import type { MyContext } from "../../../types";
import { logger } from "../../../logger";
import type { AiDraft } from "../../utils/redisStore";
import { escapeHtml } from "../../utils/html";

/** Sends text to the user, retrying with escaped text if HTML parsing fails. */
async function sendToUser(
  ctx: MyContext,
  userId: number,
  text: string,
): Promise<void> {
  try {
    await ctx.api.sendMessage(userId, text);
  } catch (e) {
    if (e instanceof GrammyError && e.description.includes("can't parse")) {
      await ctx.api.sendMessage(userId, escapeHtml(text));
    } else {
      throw e;
    }
  }
}

/** Appends the approved Q&A pair back into the knowledge base (best-effort). */
async function learn(ctx: MyContext, draft: AiDraft): Promise<void> {
  try {
    const threadId = ctx.callbackQuery?.message?.message_thread_id ?? null;
    const [embedding] = await embedDocuments([draft.question]);
    await insertQa(
      ctx.supabase.raw,
      threadId,
      draft.question,
      draft.text,
      embedding,
    );
  } catch (e) {
    logger.error({ err: e }, "KB self-learning failed");
  }
}

/** Handles the AI draft buttons (✅ send / ✏️ edit / 🗑 reject) inside topics. */
export async function aiCallbackHandler(ctx: MyContext): Promise<void> {
  const message = ctx.callbackQuery?.message;
  const data = ctx.callbackQuery?.data;
  if (!message || !data) {
    await ctx.answerCallbackQuery();
    return;
  }

  const draft = await ctx.redis.getDraft(message.message_id);
  if (!draft) {
    await ctx.answerCallbackQuery({
      text: ctx.manager.text.get("ai_draft_expired"),
    });
    try {
      await ctx.editMessageReplyMarkup();
    } catch {
      /* ignore */
    }
    return;
  }

  if (data === "ai:send") {
    try {
      await sendToUser(ctx, draft.user_id, draft.text);
    } catch (e) {
      logger.error({ err: e }, "Failed to send AI draft to user");
      await ctx.answerCallbackQuery({
        text: ctx.manager.text.get("message_not_sent"),
      });
      return;
    }
    await ctx.redis.deleteDraft(message.message_id);
    await ctx.answerCallbackQuery({ text: ctx.manager.text.get("ai_draft_sent") });
    try {
      await ctx.editMessageReplyMarkup();
    } catch {
      /* ignore */
    }
    // Never store personal VPN keys in the shared knowledge base.
    if (!draft.is_key) {
      await learn(ctx, draft);
    }
    return;
  }

  if (data === "ai:edit") {
    await ctx.redis.deleteDraft(message.message_id);
    await ctx.answerCallbackQuery({
      text: ctx.manager.text.get("ai_draft_edit_hint"),
      show_alert: true,
    });
    try {
      await ctx.editMessageReplyMarkup();
    } catch {
      /* ignore */
    }
    return;
  }

  // ai:reject
  await ctx.redis.deleteDraft(message.message_id);
  await ctx.answerCallbackQuery({
    text: ctx.manager.text.get("ai_draft_rejected"),
  });
  try {
    await ctx.deleteMessage();
  } catch {
    /* ignore */
  }
}
