import type { MyContext } from "../../../types";

/** Displays the main menu window. Mirrors Python Window.main_menu. */
export async function mainMenu(ctx: MyContext): Promise<void> {
  const text = ctx.manager.text.get("main_menu");
  await ctx.manager.sendMessage(text);
}
