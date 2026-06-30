import type { MiddlewareFn } from "grammy";

import type { MyContext } from "../../types";

/**
 * Rate-limits users on incoming messages. A user who sends a second message
 * within the TTL window has it deleted and dropped. Mirrors the Python ThrottlingMiddleware.
 */
export function throttlingMiddleware(ttlMs = 1000): MiddlewareFn<MyContext> {
  const cache = new Map<number, number>();

  return async (ctx, next) => {
    if (!ctx.message) {
      return next();
    }

    const userId = ctx.from?.id;
    if (userId === undefined) {
      return next();
    }

    const now = Date.now();
    const expiresAt = cache.get(userId);
    if (expiresAt !== undefined && expiresAt > now) {
      try {
        await ctx.deleteMessage();
      } catch {
        /* ignore */
      }
      return;
    }

    cache.set(userId, now + ttlMs);
    return next();
  };
}
