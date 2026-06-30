import { GrammyError, type Api } from "grammy";

import { config } from "../../config";
import { logger } from "../../logger";
import {
  CreateForumTopicException,
  NotAForumException,
  NotEnoughRightsException,
} from "./exceptions";
import type { RedisStore } from "./redisStore";
import { sleep } from "./telegram";
import type { UserData } from "./userData";

/**
 * Creates a forum topic in the support group.
 * Retries on rate limiting; maps Telegram errors to domain exceptions.
 */
export async function createForumTopic(api: Api, name: string): Promise<number> {
  try {
    const topic = await api.createForumTopic(config.bot.GROUP_ID, name, {
      icon_custom_emoji_id: config.bot.BOT_EMOJI_ID,
    });
    return topic.message_thread_id;
  } catch (e) {
    if (e instanceof GrammyError) {
      if (e.error_code === 429 && e.parameters.retry_after) {
        logger.warn(e.description);
        await sleep(e.parameters.retry_after * 1000);
        return createForumTopic(api, name);
      }
      const description = e.description.toLowerCase();
      if (description.includes("not enough rights")) {
        throw new NotEnoughRightsException();
      }
      if (description.includes("not a forum")) {
        throw new NotAForumException();
      }
      throw new CreateForumTopicException();
    }
    throw e;
  }
}

/** Returns the user's forum topic id, creating it if necessary. */
export async function getOrCreateForumTopic(
  api: Api,
  redis: RedisStore,
  userData: UserData,
): Promise<number | null> {
  if (userData.message_thread_id === null) {
    try {
      userData.message_thread_id = await createForumTopic(api, userData.full_name);
      await redis.updateUser(userData.id, userData);
    } catch (e) {
      await api.sendMessage(config.bot.DEV_ID, String((e as Error).message ?? e));
      logger.error(e);
    }
  }
  return userData.message_thread_id;
}
