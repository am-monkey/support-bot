import type { User } from "grammy/types";

import { config, type Config } from "../config";
import type { MyContext } from "../types";
import { TextMessage } from "./utils/texts";

const EMOJI = "💎";

/** Handles bot messaging and the single-message menu pattern. Mirrors Python Manager. */
export class Manager {
  readonly text: TextMessage;

  constructor(
    private readonly ctx: MyContext,
    languageCode: string | null | undefined,
  ) {
    this.text = new TextMessage(languageCode);
  }

  get user(): User {
    return this.ctx.from!;
  }

  get config(): Config {
    return config;
  }

  private get oldMessageId(): number {
    return this.ctx.session.message_id ?? -1;
  }

  /** Sends a message to the user and deletes the previously sent menu message. */
  async sendMessage(
    text: string,
    other?: Parameters<MyContext["api"]["sendMessage"]>[2],
  ): Promise<void> {
    const message = await this.ctx.api.sendMessage(this.user.id, text, other);
    await this.deletePreviousMessage();
    this.ctx.session.message_id = message.message_id;
  }

  /** Deletes a message, suppressing errors. */
  async deleteMessage(chatId: number, messageId: number): Promise<void> {
    try {
      await this.ctx.api.deleteMessage(chatId, messageId);
    } catch {
      /* ignore */
    }
  }

  /**
   * Deletes the previous menu message; if it can't be deleted, tries to
   * replace its text with a placeholder emoji.
   */
  async deletePreviousMessage(): Promise<void> {
    const messageId = this.oldMessageId;
    if (messageId <= 0) return;

    try {
      await this.ctx.api.deleteMessage(this.user.id, messageId);
    } catch {
      try {
        await this.ctx.api.editMessageText(this.user.id, messageId, EMOJI);
      } catch {
        /* ignore */
      }
    }
  }
}
