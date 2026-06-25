import { config } from "../../../config";
import type { MyContext } from "../../../types";
import { format, hlink } from "../../utils/html";

/** Tracks bot start/stop/block changes and notifies the support group. */
export async function myChatMemberHandler(ctx: MyContext): Promise<void> {
  const userData = ctx.userData;
  if (!userData) {
    return;
  }

  const status = ctx.myChatMember!.new_chat_member.status;
  userData.state = status;
  await ctx.redis.updateUser(userData.id, userData);

  const text =
    status === "member"
      ? ctx.manager.text.get("user_restarted_bot")
      : ctx.manager.text.get("user_stopped_bot");

  const url =
    userData.username !== "-"
      ? `https://t.me/${userData.username!.slice(1)}`
      : `tg://user?id=${userData.id}`;

  const other =
    userData.message_thread_id !== null
      ? { message_thread_id: userData.message_thread_id }
      : {};

  await ctx.api.sendMessage(
    config.bot.GROUP_ID,
    format(text, { name: hlink(userData.full_name, url) }),
    other,
  );
}
