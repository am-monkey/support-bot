import type { MyContext } from "../../../types";
import { format, hbold, hcode } from "../../utils/html";

function replyTo(ctx: MyContext) {
  return { reply_parameters: { message_id: ctx.msg!.message_id } } as const;
}

/** /id — replies with the current chat ID. */
export async function idHandler(ctx: MyContext): Promise<void> {
  await ctx.reply(hcode(ctx.chat!.id), replyTo(ctx));
}

/** /silent — toggles silent mode for the user owning the current topic. */
export async function silentHandler(ctx: MyContext): Promise<void> {
  const threadId = ctx.message!.message_thread_id!;
  const userData = await ctx.redis.getByMessageThreadId(threadId);
  if (!userData) {
    return;
  }

  if (userData.message_silent_mode) {
    const text = ctx.manager.text.get("silent_mode_disabled");
    try {
      await ctx.reply(text, replyTo(ctx));
      if (userData.message_silent_id !== null) {
        await ctx.api.unpinChatMessage(ctx.chat!.id, userData.message_silent_id);
      }
    } catch {
      /* ignore */
    }
    userData.message_silent_mode = false;
    userData.message_silent_id = null;
  } else {
    const text = ctx.manager.text.get("silent_mode_enabled");
    let pinnedId: number | null = null;
    try {
      const msg = await ctx.reply(text, replyTo(ctx));
      await ctx.api.pinChatMessage(ctx.chat!.id, msg.message_id, {
        disable_notification: true,
      });
      pinnedId = msg.message_id;
    } catch {
      /* ignore */
    }
    userData.message_silent_mode = true;
    userData.message_silent_id = pinnedId;
  }

  await ctx.redis.updateUser(userData.id, userData);
}

/** /information — shows the user's details and subscription. */
export async function informationHandler(ctx: MyContext): Promise<void> {
  const threadId = ctx.message!.message_thread_id!;
  const userData = await ctx.redis.getByMessageThreadId(threadId);
  if (!userData) {
    return;
  }

  const subscription = await ctx.supabase.getSubscription(userData.id);
  const text = ctx.manager.text.get("user_information");

  const body = format(text, {
    id: userData.id,
    full_name: hbold(userData.full_name),
    state: userData.state,
    username: userData.username,
    is_banned: userData.is_banned,
    created_at: userData.created_at,
    sub: subscription?.sub ?? "-",
    days_left: subscription?.days_left ?? "-",
  });

  await ctx.reply(body, replyTo(ctx));
}

/** /ban — toggles the user's banned status. */
export async function banHandler(ctx: MyContext): Promise<void> {
  const threadId = ctx.message!.message_thread_id!;
  const userData = await ctx.redis.getByMessageThreadId(threadId);
  if (!userData) {
    return;
  }

  let text: string;
  if (userData.is_banned) {
    userData.is_banned = false;
    text = ctx.manager.text.get("user_unblocked");
  } else {
    userData.is_banned = true;
    text = ctx.manager.text.get("user_blocked");
  }

  await ctx.reply(text, replyTo(ctx));
  await ctx.redis.updateUser(userData.id, userData);
}
