import { GrammyError, type Api } from "grammy";

import { escapeHtml } from "./html";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Sends text (HTML parse mode), retrying with escaped text if parsing fails. */
export async function sendHtmlSafe(
  api: Api,
  chatId: number,
  text: string,
): Promise<void> {
  try {
    await api.sendMessage(chatId, text);
  } catch (e) {
    if (e instanceof GrammyError && e.description.includes("can't parse")) {
      await api.sendMessage(chatId, escapeHtml(text));
    } else {
      throw e;
    }
  }
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
