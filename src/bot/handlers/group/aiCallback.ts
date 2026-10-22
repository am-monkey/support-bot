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

  const suggestion = await ctx.redis.takeSuggestion(message.message_id);
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

  // Silent mode: nothing may be delivered to the user. Keep the suggestion so
  // it can be sent once silent mode is turned off.
  const user = await ctx.redis.getUser(suggestion.user_id);
  if (user?.message_silent_mode) {
    await ctx.redis.saveSuggestion(message.message_id, suggestion);
    await ctx.answerCallbackQuery({
      text: ctx.manager.text.get("ai_suggested_silent"),
    });
    return;
  }

  try {
    await sendHtmlSafe(ctx.api, suggestion.user_id, suggestion.text);
  } catch (e) {
    logger.error({ err: e }, "Failed to send suggested reply to user");
    await ctx.redis.saveSuggestion(message.message_id, suggestion);
    await ctx.answerCallbackQuery({
      text: ctx.manager.text.get("message_not_sent"),
    });
    return;
  }

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
