import { GrammyError, type Api } from "grammy";
import type { BotCommand } from "grammy/types";

import { config } from "../config";

const privateCommands: Record<string, BotCommand[]> = {
  en: [{ command: "start", description: "Restart bot" }],
  ru: [{ command: "start", description: "Перезапустить бота" }],
};

const groupCommands: Record<string, BotCommand[]> = {
  en: [
    { command: "ban", description: "Block/Unblock a user" },
    { command: "silent", description: "Activate/Deactivate silent Mode" },
    { command: "information", description: "User information" },
  ],
  ru: [
    { command: "ban", description: "Заблокировать/Разблокировать пользователя" },
    { command: "silent", description: "Активировать/Деактивировать тихий режим" },
    { command: "information", description: "Информация о пользователе" },
  ],
};

const adminCommands: Record<string, BotCommand[]> = {
  en: [...privateCommands.en, { command: "newsletter", description: "Newsletter menu" }],
  ru: [...privateCommands.ru, { command: "newsletter", description: "Меню рассылки" }],
};

/** Registers bot commands across scopes and languages. Mirrors Python commands.setup. */
export async function setupCommands(api: Api): Promise<void> {
  const devScope = { type: "chat", chat_id: config.bot.DEV_ID } as const;
  try {
    await api.setMyCommands(adminCommands.en, { scope: devScope });
    await api.setMyCommands(adminCommands.ru, { scope: devScope, language_code: "ru" });
  } catch (e) {
    if (e instanceof GrammyError) {
      throw new Error(`Chat with DEV_ID ${config.bot.DEV_ID} not found.`);
    }
    throw e;
  }

  await api.setMyCommands(privateCommands.en, { scope: { type: "all_private_chats" } });
  await api.setMyCommands(privateCommands.ru, {
    scope: { type: "all_private_chats" },
    language_code: "ru",
  });
  await api.setMyCommands(groupCommands.en, { scope: { type: "all_group_chats" } });
  await api.setMyCommands(groupCommands.ru, {
    scope: { type: "all_group_chats" },
    language_code: "ru",
  });
}

/** Removes bot commands across scopes and languages. Mirrors Python commands.delete. */
export async function deleteCommands(api: Api): Promise<void> {
  const devScope = { type: "chat", chat_id: config.bot.DEV_ID } as const;
  try {
    await api.deleteMyCommands({ scope: devScope });
    await api.deleteMyCommands({ scope: devScope, language_code: "ru" });
  } catch (e) {
    if (e instanceof GrammyError) {
      throw new Error(`Chat with DEV_ID ${config.bot.DEV_ID} not found.`);
    }
    throw e;
  }

  await api.deleteMyCommands({ scope: { type: "all_private_chats" } });
  await api.deleteMyCommands({ scope: { type: "all_private_chats" }, language_code: "ru" });
  await api.deleteMyCommands({ scope: { type: "all_group_chats" } });
  await api.deleteMyCommands({ scope: { type: "all_group_chats" }, language_code: "ru" });
}
