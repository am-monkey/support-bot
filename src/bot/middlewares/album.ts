import type { MiddlewareFn } from "grammy";
import type { Message } from "grammy/types";

import type { MyContext } from "../../types";
import { Album, type MediaType } from "../types/album";
import { sleep } from "../utils/telegram";

function getContent(
  message: Message,
): { type: MediaType; fileId: string } | null {
  if (message.photo) {
    return { type: "photo", fileId: message.photo[message.photo.length - 1].file_id };
  }
  if (message.video) return { type: "video", fileId: message.video.file_id };
  if (message.audio) return { type: "audio", fileId: message.audio.file_id };
  if (message.document) {
    return { type: "document", fileId: message.document.file_id };
  }
  return null;
}

/**
 * Batches messages sharing a media_group_id into a single Album.
 * Only the first message of a group proceeds to handlers (with ctx.album set);
 * the rest are absorbed. Mirrors the Python AlbumMiddleware.
 */
export function albumMiddleware(latencyMs = 200): MiddlewareFn<MyContext> {
  const cache = new Map<string, Album>();

  return async (ctx, next) => {
    const message = ctx.message;
    if (!message || !message.media_group_id) {
      return next();
    }

    const content = getContent(message);
    if (!content) {
      return next();
    }

    const key = message.media_group_id;
    const existing = cache.get(key);
    if (existing) {
      existing.add(content.type, content.fileId);
      return; // absorbed into the in-progress album
    }

    const album = new Album();
    album.add(content.type, content.fileId);
    album.caption = message.caption;
    cache.set(key, album);

    await sleep(latencyMs);
    cache.delete(key);
    ctx.album = album;

    return next();
  };
}
