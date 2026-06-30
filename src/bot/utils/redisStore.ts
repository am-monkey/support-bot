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
}
