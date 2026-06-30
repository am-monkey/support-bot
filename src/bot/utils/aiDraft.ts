import { InlineKeyboard } from "grammy";

import { buildDraft } from "../../ai/draft";
import { config } from "../../config";
import { logger } from "../../logger";
import type { MyContext } from "../../types";
import { escapeHtml, format, hcode, hlink } from "./html";
import { sendHtmlSafe } from "./telegram";
import type { UserData } from "./userData";

/**
 * Posts an "operator needed" notice into the user's topic, plus the AI's
 * suggested reply with a one-tap "send" button (when a suggestion exists). The
 * operator can approve the suggestion or just type their own reply, which the
 * existing operator relay forwards to the user.
 */
async function escalate(
  ctx: MyContext,
  userData: UserData,
  threadOpts: { message_thread_id?: number },
  reason: string,
  relevance: string,
  question: string,
  suggestion: string,
): Promise<void> {
  const notice = format(ctx.manager.text.get("ai_escalated"), {
    operator: hlink("оператор", `tg://user?id=${config.bot.DEV_ID}`),
    reason,
    relevance,
    question: escapeHtml(question),
  });
  await ctx.api.sendMessage(config.bot.GROUP_ID, notice, threadOpts);

  if (!suggestion.trim()) {
    return;
  }

  const keyboard = new InlineKeyboard().text(
    ctx.manager.text.get("ai_btn_send_suggested"),
    "ai:approve",
  );
  const msg = await ctx.api.sendMessage(
    config.bot.GROUP_ID,
    format(ctx.manager.text.get("ai_suggested_answer"), {
      answer: escapeHtml(suggestion),
    }),
    { ...threadOpts, reply_markup: keyboard },
  );
  await ctx.redis.saveSuggestion(msg.message_id, {
    user_id: userData.id,
    text: suggestion,
  });
}

/**
 * Auto-answers the user directly and notifies operators in the user's topic.
 * Escalates to an operator (no auto-answer, but with a suggested reply) when the
 * user asks for one, the AI can't answer, or KB relevance is below the threshold.
 *
 * VPN key requests are served by fetching the key STRICTLY by userData.id (the
 * topic owner) — never from message text — so a user only ever gets their own
 * key. Best-effort: failures are logged and swallowed so operators still see
 * the forwarded message and can reply manually.
 */
export async function handleAiReply(
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
  const relevance = `${Math.round(outcome.topSimilarity * 100)}%`;
  const confidence = `${Math.round(outcome.confidence * 100)}%`;

  try {
    // VPN key request → send the user their own key directly.
    if (outcome.wantsOwnKey) {
      const key = await ctx.supabase.getVpnKey(userData.id);
      if (key) {
        await sendHtmlSafe(
          ctx.api,
          userData.id,
          format(ctx.manager.text.get("vpn_key_message"), { key: hcode(key) }),
        );
        await ctx.api.sendMessage(
          config.bot.GROUP_ID,
          ctx.manager.text.get("ai_key_sent_note"),
          threadOpts,
        );
        return;
      }
      await escalate(
        ctx,
        userData,
        threadOpts,
        ctx.manager.text.get("vpn_key_not_found"),
        relevance,
        question,
        "",
      );
      return;
    }

    // Decide whether to escalate or auto-answer.
    const reasonKey = outcome.wantsOperator
      ? "ai_escalation_reason_operator"
      : outcome.needsHuman
        ? "ai_escalation_reason_no_answer"
        : outcome.topSimilarity < config.ai.ESCALATE_SIMILARITY
          ? "ai_escalation_reason_low_relevance"
          : null;

    if (reasonKey) {
      await escalate(
        ctx,
        userData,
        threadOpts,
        ctx.manager.text.get(reasonKey),
        relevance,
        question,
        outcome.answer,
      );
      return;
    }

    // Auto-answer the user and notify operators with what was sent.
    await sendHtmlSafe(ctx.api, userData.id, outcome.answer);
    await ctx.api.sendMessage(
      config.bot.GROUP_ID,
      format(ctx.manager.text.get("ai_auto_reply_note"), {
        relevance,
        confidence,
        answer: escapeHtml(outcome.answer),
      }),
      threadOpts,
    );
  } catch (e) {
    logger.error({ err: e }, "handleAiReply failed");
  }
}
