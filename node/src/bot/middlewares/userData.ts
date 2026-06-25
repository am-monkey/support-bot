import type { MiddlewareFn } from "grammy";

import type { MyContext } from "../../types";
import type { RedisStore } from "../utils/redisStore";
import { SUPPORTED_LANGUAGES } from "../utils/texts";
import {
  createUserData,
  fullName,
  usernameOf,
  type UserData,
} from "../utils/userData";

/**
 * Injects the Redis store and loads/creates the user's UserData (private chats only).
 * Mirrors the Python RedisMiddleware.
 */
export function userDataMiddleware(redis: RedisStore): MiddlewareFn<MyContext> {
  return async (ctx, next) => {
    ctx.redis = redis;

    const user = ctx.from;
    if (ctx.chat?.type === "private" && user) {
      const existing = await redis.getUser(user.id);
      let data: UserData;
      if (existing) {
        data = existing;
        data.full_name = fullName(user);
        data.username = usernameOf(user);
      } else {
        data = createUserData(user);
      }

      const languages = Object.keys(SUPPORTED_LANGUAGES);
      if (languages.length === 1) {
        data.language_code = languages[0];
      }

      await redis.updateUser(user.id, data);
      ctx.userData = data;
    } else {
      ctx.userData = null;
    }

    await next();
  };
}
