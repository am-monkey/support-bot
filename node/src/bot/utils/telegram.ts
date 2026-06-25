import type { Api } from "grammy";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Deletes a message, ignoring "message not found / can't be deleted" errors. */
export async function safeDelete(
  api: Api,
  chatId: number,
  messageId: number,
): Promise<void> {
  try {
    await api.deleteMessage(chatId, messageId);
  } catch {
    /* ignore */
  }
}

/** Sends a transient reply that auto-deletes after the given delay. */
export async function replyTransient(
  api: Api,
  chatId: number,
  replyToMessageId: number,
  text: string,
  delayMs = 5000,
): Promise<void> {
  const msg = await api.sendMessage(chatId, text, {
    reply_parameters: { message_id: replyToMessageId },
  });
  await sleep(delayMs);
  await safeDelete(api, chatId, msg.message_id);
}
