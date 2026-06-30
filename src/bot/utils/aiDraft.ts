import { InlineKeyboard } from "grammy";

import { buildDraft } from "../../ai/draft";
import { config } from "../../config";
import { logger } from "../../logger";
import type { MyContext } from "../../types";
import { escapeHtml, format, hlink } from "./html";
import type { UserData } from "./userData";

/**
 * Generates an AI draft for the user's question and posts it into the user's
 * forum topic (operator-side, invisible to the user) with approve/edit/reject
 * buttons. The clean draft text is stored in Redis keyed by the buttons message
 * id, so approval sends exactly that text. Best-effort: failures are logged and
 * swallowed so the normal operator flow is unaffected.
 */
export async function postDraftToTopic(
  ctx: MyContext,
  userData: UserData,
  question: string,
): Promise<void> {
  const outcome = await buildDraft(ctx.supabase, question);
  if (!outcome) {
    return;
  }

  const threadOpts =
    userData.message_thread_id !== null
      ? { message_thread_id: userData.message_thread_id }
      : {};
  const confidence = `${Math.round(outcome.confidence * 100)}%`;

  // Operator-facing header (separate message so the draft message stays clean).
  const header = outcome.needsHuman
    ? format(ctx.manager.text.get("ai_draft_low_confidence"), {
        confidence,
        operator: hlink("оператор", `tg://user?id=${config.bot.DEV_ID}`),
        reason: escapeHtml(outcome.reason),
      })
    : format(ctx.manager.text.get("ai_draft_header"), { confidence });

  try {
    await ctx.api.sendMessage(config.bot.GROUP_ID, header, threadOpts);

    const keyboard = new InlineKeyboard()
      .text(ctx.manager.text.get("ai_btn_send"), "ai:send")
      .text(ctx.manager.text.get("ai_btn_edit"), "ai:edit")
      .text(ctx.manager.text.get("ai_btn_reject"), "ai:reject");

    const draftMsg = await ctx.api.sendMessage(
      config.bot.GROUP_ID,
      escapeHtml(outcome.draft),
      { ...threadOpts, reply_markup: keyboard },
    );

    await ctx.redis.saveDraft(draftMsg.message_id, {
      user_id: userData.id,
      question,
      text: outcome.draft,
    });
  } catch (e) {
    logger.error({ err: e }, "Failed to post AI draft to topic");
  }
}
