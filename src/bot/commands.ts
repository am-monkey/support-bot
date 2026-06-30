import { GrammyError, type Api } from "grammy";
import type { BotCommand } from "grammy/types";

import { config } from "../config";

const privateCommands: BotCommand[] = [
  { command: "start", description: "Перезапустить бота" },
];

const groupCommands: BotCommand[] = [
  { command: "ban", description: "Заблокировать/Разблокировать пользователя" },
  { command: "silent", description: "Активировать/Деактивировать тихий режим" },
  { command: "information", description: "Информация о пользователе" },
];

/** Registers bot commands across scopes (Russian only). Mirrors Python commands.setup. */
export async function setupCommands(api: Api): Promise<void> {
  const devScope = { type: "chat", chat_id: config.bot.DEV_ID } as const;
  try {
    await api.setMyCommands(privateCommands, { scope: devScope });
  } catch (e) {
    if (e instanceof GrammyError) {
      throw new Error(`Chat with DEV_ID ${config.bot.DEV_ID} not found.`);
    }
    throw e;
  }

  await api.setMyCommands(privateCommands, { scope: { type: "all_private_chats" } });
  await api.setMyCommands(groupCommands, { scope: { type: "all_group_chats" } });
}

/** Removes bot commands across scopes. Mirrors Python commands.delete. */
export async function deleteCommands(api: Api): Promise<void> {
  const devScope = { type: "chat", chat_id: config.bot.DEV_ID } as const;
  try {
    await api.deleteMyCommands({ scope: devScope });
  } catch (e) {
    if (e instanceof GrammyError) {
      throw new Error(`Chat with DEV_ID ${config.bot.DEV_ID} not found.`);
    }
    throw e;
  }

  await api.deleteMyCommands({ scope: { type: "all_private_chats" } });
  await api.deleteMyCommands({ scope: { type: "all_group_chats" } });
}
