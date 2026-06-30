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

  /**
   * Returns the VPN key for a user, looked up STRICTLY by their chat_id.
   * The caller must pass the trusted sender/topic-owner id — never a value from
   * message text — so a user can only ever receive their own key.
   * Column name is configurable via SUPABASE_VPN_KEY_COLUMN (default "vpn_key").
   */
  async getVpnKey(userId: number): Promise<string | null> {
    const column = process.env.SUPABASE_VPN_KEY_COLUMN ?? "vpn_key";
    const { data, error } = await this.client
      .from(TABLE_NAME)
      .select(column)
      .eq(CHAT_ID_FIELD, userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    const value = (data as unknown as Record<string, unknown>)[column];
    return value ? String(value) : null;
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
