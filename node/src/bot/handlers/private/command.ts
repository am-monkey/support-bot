import { config } from "../../../config";
import type { MyContext } from "../../../types";
import { getOrCreateForumTopic } from "../../utils/forumTopic";
import { format } from "../../utils/html";
import { sleep } from "../../utils/telegram";
import { mainMenu } from "./windows";

/** /start — shows the main menu and ensures the user's forum topic exists. */
export async function startHandler(ctx: MyContext): Promise<void> {
  await mainMenu(ctx);
  await ctx.manager.deleteMessage(ctx.chat!.id, ctx.msg!.message_id);

  if (ctx.userData) {
    await getOrCreateForumTopic(ctx.api, ctx.redis, ctx.userData);
  }
}

/**
 * /newsletter (admin only) — immediately broadcasts a message to all users.
 * Usage: `/newsletter your text`, or reply to a message with `/newsletter`.
 */
export async function newsletterHandler(ctx: MyContext): Promise<void> {
  const text = ((ctx.match as string) ?? "").trim();
  const reply = ctx.msg?.reply_to_message;
  const chatId = ctx.chat!.id;

  await ctx.manager.deleteMessage(chatId, ctx.msg!.message_id);

  if (!text && !reply) {
    await ctx.api.sendMessage(
      config.bot.DEV_ID,
      ctx.manager.text.get("newsletter_usage"),
    );
    return;
  }

  const userIds = await ctx.redis.getAllUserIds();
  let ok = 0;
  for (const id of userIds) {
    try {
      if (text) {
        await ctx.api.sendMessage(id, text);
      } else if (reply) {
        await ctx.api.copyMessage(id, chatId, reply.message_id);
      }
      ok += 1;
    } catch {
      /* user blocked the bot or is unreachable */
    }
    await sleep(35); // ~30 messages/second
  }

  await ctx.api.sendMessage(
    config.bot.DEV_ID,
    format(ctx.manager.text.get("newsletter_done"), {
      ok,
      total: userIds.length,
    }),
  );
}
