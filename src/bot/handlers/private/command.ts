import type { MyContext } from "../../../types";
import { getOrCreateForumTopic } from "../../utils/forumTopic";
import { mainMenu } from "./windows";

/** /start — shows the main menu and ensures the user's forum topic exists. */
export async function startHandler(ctx: MyContext): Promise<void> {
  await mainMenu(ctx);
  await ctx.manager.deleteMessage(ctx.chat!.id, ctx.msg!.message_id);

  if (ctx.userData) {
    await getOrCreateForumTopic(ctx.api, ctx.redis, ctx.userData);
  }
}
