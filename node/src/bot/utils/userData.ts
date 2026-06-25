import type { User } from "grammy/types";

/** User information persisted in Redis. Mirrors the Python UserData dataclass. */
export interface UserData {
  message_thread_id: number | null;
  message_silent_id: number | null;
  message_silent_mode: boolean;
  id: number;
  full_name: string;
  username: string | null;
  state: string;
  is_banned: boolean;
  language_code: string | null;
  created_at: string;
}

/** Current timestamp in UTC+3, formatted as "YYYY-MM-DD HH:MM:SS". */
function createdAtNow(): string {
  const shifted = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 19).replace("T", " ");
}

export function fullName(user: User): string {
  return [user.first_name, user.last_name].filter(Boolean).join(" ");
}

export function usernameOf(user: User): string {
  return user.username ? `@${user.username}` : "-";
}

/** Builds a fresh UserData with the same defaults as the Python dataclass. */
export function createUserData(user: User): UserData {
  return {
    message_thread_id: null,
    message_silent_id: null,
    message_silent_mode: false,
    id: user.id,
    full_name: fullName(user),
    username: usernameOf(user),
    state: "member",
    is_banned: false,
    language_code: null,
    created_at: createdAtNow(),
  };
}
