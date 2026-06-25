import { parseMode } from "@grammyjs/parse-mode";
import { run, type RunnerHandle } from "@grammyjs/runner";
import { RedisAdapter } from "@grammyjs/storage-redis";
import { Bot, session } from "grammy";
import IORedis from "ioredis";

import { config } from "./config";
import { logger } from "./logger";
import { setupCommands, deleteCommands } from "./bot/commands";
import { errorHandler } from "./bot/handlers/errors";
import { registerHandlers } from "./bot/handlers";
import { albumMiddleware } from "./bot/middlewares/album";
import { managerMiddleware } from "./bot/middlewares/manager";
import { supabaseMiddleware } from "./bot/middlewares/supabase";
import { throttlingMiddleware } from "./bot/middlewares/throttling";
import { userDataMiddleware } from "./bot/middlewares/userData";
import { RedisStore } from "./bot/utils/redisStore";
import { createSupabaseStore } from "./bot/utils/supabaseStore";
import type { MyContext, SessionData } from "./types";

async function main(): Promise<void> {
  const redis = new IORedis({
    host: config.redis.HOST,
    port: config.redis.PORT,
    db: config.redis.DB,
    maxRetriesPerRequest: null,
  });
  redis.on("error", (e) => logger.error({ err: e }, "Redis error"));

  const redisStore = new RedisStore(redis);
  const supabaseStore = createSupabaseStore(config.supabase);

  const bot = new Bot<MyContext>(config.bot.TOKEN);

  // Default HTML parse mode for all outgoing messages.
  bot.api.config.use(parseMode("HTML"));

  // Middlewares (outer -> inner), matching the Python registration order.
  bot.use(
    session<SessionData, MyContext>({
      initial: () => ({}),
      storage: new RedisAdapter<SessionData>({ instance: redis }),
    }),
  );
  bot.use(userDataMiddleware(redisStore));
  bot.use(supabaseMiddleware(supabaseStore));
  bot.use(managerMiddleware);
  bot.use(albumMiddleware());
  bot.use(throttlingMiddleware());

  registerHandlers(bot);
  bot.catch(errorHandler);

  await bot.api.deleteWebhook();
  await setupCommands(bot.api);

  let runner: RunnerHandle | undefined;

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down...`);
    try {
      if (runner?.isRunning()) {
        await runner.stop();
      }
      await deleteCommands(bot.api);
      await redis.quit();
    } catch (e) {
      logger.error(e);
    }
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  runner = run(bot);
  logger.info("Bot started");

  // Surface fatal polling errors (e.g. 409 Conflict: another instance is
  // polling the same token) as a clean log + controlled exit instead of an
  // unhandled rejection.
  void runner.task()?.catch((err) => {
    logger.error({ err }, "Polling stopped with an error");
    process.exit(1);
  });
}

main().catch((e) => {
  logger.error(e);
  process.exit(1);
});
