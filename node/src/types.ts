import type { Context, SessionFlavor } from "grammy";

import type { Album } from "./bot/types/album";
import type { Manager } from "./bot/manager";
import type { RedisStore } from "./bot/utils/redisStore";
import type { SupabaseStore } from "./bot/utils/supabaseStore";
import type { UserData } from "./bot/utils/userData";

export interface SessionData {
  message_id?: number;
  language_code?: string;
}

export type MyContext = Context &
  SessionFlavor<SessionData> & {
    redis: RedisStore;
    supabase: SupabaseStore;
    manager: Manager;
    userData: UserData | null;
    album?: Album;
  };
