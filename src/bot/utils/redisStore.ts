import type { Redis } from "ioredis";

import type { UserData } from "./userData";

/** Manages user data storage in Redis. Mirrors the Python RedisStorage. */
export class RedisStore {
  private static readonly NAME = "users";

  constructor(private readonly redis: Redis) {}

  private indexKey(messageThreadId: number): string {
    return `${RedisStore.NAME}_index_${messageThreadId}`;
  }

  async getUser(id: number): Promise<UserData | null> {
    const data = await this.redis.hget(RedisStore.NAME, String(id));
    return data === null ? null : (JSON.parse(data) as UserData);
  }

  async updateUser(id: number, data: UserData): Promise<void> {
    await this.redis.hset(RedisStore.NAME, String(id), JSON.stringify(data));
    if (data.message_thread_id !== null) {
      await this.redis.hset(this.indexKey(data.message_thread_id), String(id), "1");
    }
  }

  async getByMessageThreadId(messageThreadId: number): Promise<UserData | null> {
    const userId = await this.getUserIdByMessageThreadId(messageThreadId);
    return userId === null ? null : this.getUser(userId);
  }

  private async getUserIdByMessageThreadId(
    messageThreadId: number,
  ): Promise<number | null> {
    const userIds = await this.redis.hkeys(this.indexKey(messageThreadId));
    return userIds.length > 0 ? Number(userIds[0]) : null;
  }

  async getAllUserIds(): Promise<number[]> {
    const userIds = await this.redis.hkeys(RedisStore.NAME);
    return userIds.map(Number);
  }

  private suggestionKey(messageId: number): string {
    return `ai_suggestion_${messageId}`;
  }

  /** Stores an AI-suggested reply for operator approval, keyed by the button message id. */
  async saveSuggestion(
    messageId: number,
    suggestion: AiSuggestion,
    ttlSeconds = 7 * 24 * 60 * 60,
  ): Promise<void> {
    await this.redis.set(
      this.suggestionKey(messageId),
      JSON.stringify(suggestion),
      "EX",
      ttlSeconds,
    );
  }

  private operatorReplyKey(userId: number): string {
    return `operator_reply_${userId}`;
  }

  /**
   * Marks that an operator replied to the user: while the key lives, the AI
   * must not auto-answer this user's messages. Each operator reply refreshes
   * the TTL; after it expires the AI resumes on the next user message.
   */
  async markOperatorReply(userId: number, ttlSeconds: number): Promise<void> {
    // EX needs a positive integer; a zero pause means the pause is disabled.
    const ttl = Math.round(ttlSeconds);
    if (ttl < 1) {
      return;
    }
    await this.redis.set(this.operatorReplyKey(userId), "1", "EX", ttl);
  }

  /** Whether an operator replied to this user within the pause window. */
  async isOperatorActive(userId: number): Promise<boolean> {
    return (await this.redis.exists(this.operatorReplyKey(userId))) === 1;
  }

  /**
   * Atomically reads and removes a suggestion (GETDEL), so concurrent taps on
   * the approve button can't both send it. Put it back with saveSuggestion if
   * it wasn't delivered.
   */
  async takeSuggestion(messageId: number): Promise<AiSuggestion | null> {
    const data = await this.redis.getdel(this.suggestionKey(messageId));
    return data === null ? null : (JSON.parse(data) as AiSuggestion);
  }
}

/** An AI-suggested reply offered to an operator on escalation. */
export interface AiSuggestion {
  user_id: number;
  text: string;
}
