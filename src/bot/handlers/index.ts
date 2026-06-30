import type { Bot } from "grammy";

import { config } from "../../config";
import type { MyContext } from "../../types";
import {
  banHandler,
  idHandler,
  informationHandler,
  silentHandler,
} from "./group/command";
import {
  deleteServiceHandler,
  operatorMessageHandler,
  topicCreatedHandler,
} from "./group/message";
import { callbackQueryHandler } from "./private/callbackQuery";
import { newsletterHandler, startHandler } from "./private/command";
import {
  editedMessageHandler,
  incomingMessageHandler,
} from "./private/message";
import { myChatMemberHandler } from "./private/myChatMember";

export function registerHandlers(bot: Bot<MyContext>): void {
  // /id works in any group/supergroup.
  bot.chatType(["group", "supergroup"]).command("id", idHandler);

  // Support-group topics: commands and message relay.
  const groupThread = bot.filter(
    (ctx) =>
      (ctx.chat?.type === "group" || ctx.chat?.type === "supergroup") &&
      ctx.chat?.id === config.bot.GROUP_ID &&
      ctx.message?.message_thread_id != null,
  );
  groupThread.command("silent", silentHandler);
  groupThread.command("information", informationHandler);
  groupThread.command("ban", banHandler);
  groupThread.on("message:forum_topic_created", topicCreatedHandler);
  groupThread.on(
    [
      "message:pinned_message",
      "message:forum_topic_edited",
      "message:forum_topic_closed",
      "message:forum_topic_reopened",
    ],
    deleteServiceHandler,
  );
  groupThread.on("message", operatorMessageHandler);

  // Private chat.
  const priv = bot.chatType("private");
  priv.command("start", startHandler);
  priv
    .filter((ctx) => ctx.from?.id === config.bot.DEV_ID)
    .command("newsletter", newsletterHandler);
  priv.on("edited_message", editedMessageHandler);
  priv.on("my_chat_member", myChatMemberHandler);
  priv.on("callback_query", callbackQueryHandler);
  priv.on("message", incomingMessageHandler);
}
