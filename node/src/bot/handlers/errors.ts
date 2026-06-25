import { type BotError, InputFile } from "grammy";

import { config } from "../../config";
import { logger } from "../../logger";
import type { MyContext } from "../../types";
import {
  CreateForumTopicException,
  NotEnoughRightsException,
} from "../utils/exceptions";
import { hbold, hcode } from "../utils/html";
import { sleep } from "../utils/telegram";

/** Global error handler. Mirrors the Python errors router. */
export async function errorHandler(err: BotError<MyContext>): Promise<void> {
  const { ctx, error } = err;
  const message = error instanceof Error ? error.message : String(error);

  // Ignore outdated callback queries.
  if (message.includes("query is too old")) {
    return;
  }

  try {
    if (error instanceof NotEnoughRightsException) {
      logger.error(error);
      await ctx.api.sendMessage(config.bot.DEV_ID, NotEnoughRightsException.message);
      return;
    }

    if (error instanceof CreateForumTopicException) {
      logger.error(error);
      await ctx.api.sendMessage(config.bot.DEV_ID, CreateForumTopicException.message);
      return;
    }

    logger.error({ err: error }, "Unhandled error");

    const excName = error instanceof Error ? error.name : "Error";
    const stack = error instanceof Error && error.stack ? error.stack : message;
    const updateJson = JSON.stringify(ctx.update, null, 2);

    const document = new InputFile(
      Buffer.from(stack, "utf-8"),
      `error_${ctx.update.update_id}.txt`,
    );
    const caption = `${hbold(excName)}:\n${hcode(message.slice(0, 1024 - excName.length - 2))}`;
    const sent = await ctx.api.sendDocument(config.bot.DEV_ID, document, { caption });

    for (let i = 0; i < updateJson.length; i += 4096) {
      await sleep(100);
      await ctx.api.sendMessage(config.bot.DEV_ID, hcode(updateJson.slice(i, i + 4096)), {
        reply_parameters: { message_id: sent.message_id },
      });
    }
  } catch (sendError) {
    logger.error(sendError);
  }
}
