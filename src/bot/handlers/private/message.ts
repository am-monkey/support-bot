import { GrammyError } from "grammy";

import { config } from "../../../config";
import type { MyContext } from "../../../types";
import { postDraftToTopic } from "../../utils/aiDraft";
import { createForumTopic, getOrCreateForumTopic } from "../../utils/forumTopic";
import { replyTransient } from "../../utils/telegram";

/** Notifies the user that an edited message was not re-sent. */
export async function editedMessageHandler(ctx: MyContext): Promise<void> {
  const text = ctx.manager.text.get("message_edited");
  await replyTransient(
    ctx.api,
    ctx.chat!.id,
    ctx.editedMessage!.message_id,
    text,
  );
}

/** Forwards an incoming user message (or album) into the user's forum topic. */
export async function incomingMessageHandler(ctx: MyContext): Promise<void> {
  const userData = ctx.userData;
  if (!userData || userData.is_banned) {
    return;
  }

  const message = ctx.message!;

  const copyToTopic = async (): Promise<void> => {
    const threadId = await getOrCreateForumTopic(ctx.api, ctx.redis, userData);
    const other = threadId !== null ? { message_thread_id: threadId } : {};
    if (!ctx.album) {
      await ctx.api.forwardMessage(
        config.bot.GROUP_ID,
        ctx.chat!.id,
        message.message_id,
        other,
      );
    } else {
      await ctx.album.copyTo(ctx.api, config.bot.GROUP_ID, other);
    }
  };

  try {
    await copyToTopic();
  } catch (e) {
    if (e instanceof GrammyError && e.description.includes("message thread not found")) {
      userData.message_thread_id = await createForumTopic(
        ctx.api,
        userData.full_name,
      );
      await ctx.redis.updateUser(userData.id, userData);
      await copyToTopic();
    } else {
      throw e;
    }
  }

  // Generate an AI draft for the operator (invisible to the user), in parallel
  // with the transient confirmation so the 5s auto-delete doesn't delay it.
  // Only for text questions; albums and media without a caption go to operators.
  const question = message.text ?? message.caption;
  await Promise.all([
    replyTransient(
      ctx.api,
      ctx.chat!.id,
      message.message_id,
      ctx.manager.text.get("message_sent"),
    ),
    question && question.trim()
      ? postDraftToTopic(ctx, userData, question)
      : Promise.resolve(),
  ]);
}
