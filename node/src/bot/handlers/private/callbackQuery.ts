import type { MyContext } from "../../../types";

/** Acknowledges callback queries in private chats. */
export async function callbackQueryHandler(ctx: MyContext): Promise<void> {
  await ctx.answerCallbackQuery();
}
