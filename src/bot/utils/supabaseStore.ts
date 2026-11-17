import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { SupabaseConfig } from "../../config";
import { logger } from "../../logger";

const TABLE_NAME = "users";
const CHAT_ID_FIELD = "chat_id";
// The key users paste into their app (column owned by krugvpn-bot).
const DEFAULT_VPN_KEY_COLUMN = "sub";

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
   * Column name is configurable via SUPABASE_VPN_KEY_COLUMN (default "sub").
   */
  async getVpnKey(userId: number): Promise<string | null> {
    const column = process.env.SUPABASE_VPN_KEY_COLUMN ?? DEFAULT_VPN_KEY_COLUMN;
    const { data, error } = await this.client
      .from(TABLE_NAME)
      .select(column)
      .eq(CHAT_ID_FIELD, userId)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, column }, "getVpnKey query failed");
      return null;
    }
    if (!data) {
      return null;
    }
    const value = (data as unknown as Record<string, unknown>)[column];
    return value ? String(value) : null;
  }

  async getSubscription(userId: number): Promise<Subscription | null> {
    const { data, error } = await this.client
      .from(TABLE_NAME)
      .select(`${DEFAULT_VPN_KEY_COLUMN}, expiry_time`)
      .eq(CHAT_ID_FIELD, userId)
      .maybeSingle();

    if (error) {
      logger.error({ err: error }, "getSubscription query failed");
      return null;
    }
    if (!data) {
      return null;
    }

    const row = data as unknown as Record<string, unknown>;
    const sub = (row[DEFAULT_VPN_KEY_COLUMN] as string | null) || "-";

    let days_left: number | string = "-";
    if (row.expiry_time !== null && row.expiry_time !== undefined) {
      const expiryTs = Number(row.expiry_time) / 1000;
      const nowTs = Date.now() / 1000;
      days_left = Math.max(0, Math.floor((expiryTs - nowTs) / 86400));
    }

    return { sub, days_left };
  }
}

export function createSupabaseStore(cfg: SupabaseConfig): SupabaseStore {
  return new SupabaseStore(createClient(cfg.URL, cfg.KEY));
}
