import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { SupabaseConfig } from "../../config";

const TABLE_NAME = "users";
const CHAT_ID_FIELD = "chat_id";

export interface Subscription {
  sub: string;
  days_left: number | string;
}

/** Reads user subscription data from Supabase. Mirrors the Python SupabaseStorage. */
export class SupabaseStore {
  constructor(private readonly client: SupabaseClient) {}

  /** Raw Supabase client, for modules that issue their own queries (e.g. the knowledge base). */
  get raw(): SupabaseClient {
    return this.client;
  }

  async getSubscription(userId: number): Promise<Subscription | null> {
    const { data } = await this.client
      .from(TABLE_NAME)
      .select("sub, expiry_time")
      .eq(CHAT_ID_FIELD, userId)
      .maybeSingle();

    if (!data) {
      return null;
    }

    const sub: string = (data.sub as string) || "-";

    let days_left: number | string = "-";
    if (data.expiry_time !== null && data.expiry_time !== undefined) {
      const expiryTs = Number(data.expiry_time) / 1000;
      const nowTs = Date.now() / 1000;
      days_left = Math.max(0, Math.floor((expiryTs - nowTs) / 86400));
    }

    return { sub, days_left };
  }
}

export function createSupabaseStore(cfg: SupabaseConfig): SupabaseStore {
  return new SupabaseStore(createClient(cfg.URL, cfg.KEY));
}
