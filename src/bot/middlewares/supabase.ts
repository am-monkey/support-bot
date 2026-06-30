import type { MiddlewareFn } from "grammy";

import type { MyContext } from "../../types";
import type { SupabaseStore } from "../utils/supabaseStore";

/** Injects the Supabase store into the context. Mirrors the Python SupabaseMiddleware. */
export function supabaseMiddleware(
  supabase: SupabaseStore,
): MiddlewareFn<MyContext> {
  return async (ctx, next) => {
    ctx.supabase = supabase;
    await next();
  };
}
