import { config } from "../../../config";
import { logger } from "../../../logger";
import type { MyContext } from "../../../types";
import { sendHtmlSafe } from "../../utils/telegram";

/** Approves an AI-suggested reply: sends it to the user and clears the button. */
export async function aiCallbackHandler(ctx: MyContext): Promise<void> {
  const message = ctx.callbackQuery?.message;
  if (!message) {
    await ctx.answerCallbackQuery();
    return;
  }

  const suggestion = await ctx.redis.getSuggestion(message.message_id);
  if (!suggestion) {
    await ctx.answerCallbackQuery({
      text: ctx.manager.text.get("ai_suggested_expired"),
    });
    try {
      await ctx.editMessageReplyMarkup();
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    await sendHtmlSafe(ctx.api, suggestion.user_id, suggestion.text);
  } catch (e) {
    logger.error({ err: e }, "Failed to send suggested reply to user");
    await ctx.answerCallbackQuery({
      text: ctx.manager.text.get("message_not_sent"),
    });
    return;
  }

  await ctx.redis.deleteSuggestion(message.message_id);
  // An operator approved the reply — pause AI auto-replies for this user.
  await ctx.redis.markOperatorReply(
    suggestion.user_id,
    config.ai.OPERATOR_PAUSE_MINUTES * 60,
  );
  await ctx.answerCallbackQuery({
    text: ctx.manager.text.get("ai_suggested_sent"),
  });
  try {
    await ctx.editMessageReplyMarkup();
  } catch {
    /* ignore */
  }
}
