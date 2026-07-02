import { GrammyError } from "grammy";

import { config } from "../../../config";
import type { MyContext } from "../../../types";
import { format, hlink } from "../../utils/html";
import { replyTransient, sleep } from "../../utils/telegram";

/** When a forum topic is created, posts a welcome/help message and pins it. */
export async function topicCreatedHandler(ctx: MyContext): Promise<void> {
  await sleep(3000);

  const userData = await ctx.redis.getByMessageThreadId(
    ctx.message!.message_thread_id!,
  );
  if (!userData) {
    return;
  }

  const url =
    userData.username !== "-"
      ? `https://t.me/${userData.username!.slice(1)}`
      : `tg://user?id=${userData.id}`;

  const text = ctx.manager.text.get("user_started_bot");
  const other =
    userData.message_thread_id !== null
      ? { message_thread_id: userData.message_thread_id }
      : {};

  const sent = await ctx.api.sendMessage(
    config.bot.GROUP_ID,
    format(text, { name: hlink(userData.full_name, url) }),
    other,
  );

  await ctx.api.pinChatMessage(config.bot.GROUP_ID, sent.message_id);
}

/** Deletes forum service messages (pinned/created/edited/closed/reopened). */
export async function deleteServiceHandler(ctx: MyContext): Promise<void> {
  try {
    await ctx.deleteMessage();
  } catch {
    /* ignore */
  }
}

/** Relays an operator's reply from the topic back to the user. */
export async function operatorMessageHandler(ctx: MyContext): Promise<void> {
  if (ctx.from?.is_bot) {
    return;
  }

  const userData = await ctx.redis.getByMessageThreadId(
    ctx.message!.message_thread_id!,
  );
  if (!userData || userData.message_silent_mode) {
    return;
  }

  let errorText: string | null = null;
  try {
    if (!ctx.album) {
      await ctx.api.copyMessage(userData.id, ctx.chat!.id, ctx.message!.message_id);
    } else {
      await ctx.album.copyTo(ctx.api, userData.id);
    }
  } catch (e) {
    if (e instanceof GrammyError && e.description.includes("blocked")) {
      errorText = ctx.manager.text.get("blocked_by_user");
    } else {
      errorText = ctx.manager.text.get("message_not_sent");
    }
  }

  if (errorText) {
    await replyTransient(
      ctx.api,
      ctx.chat!.id,
      ctx.message!.message_id,
      errorText,
    );
    return;
  }

  // Operator answered — pause AI auto-replies for this user.
  await ctx.redis.markOperatorReply(
    userData.id,
    config.ai.OPERATOR_PAUSE_MINUTES * 60,
  );
}
