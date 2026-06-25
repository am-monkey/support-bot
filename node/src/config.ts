import * as dotenv from "dotenv";

dotenv.config();

export interface BotConfig {
  TOKEN: string;
  DEV_ID: number;
  GROUP_ID: number;
  BOT_EMOJI_ID: string;
}

export interface RedisConfig {
  HOST: string;
  PORT: number;
  DB: number;
}

export interface SupabaseConfig {
  URL: string;
  KEY: string;
}

export interface Config {
  bot: BotConfig;
  redis: RedisConfig;
  supabase: SupabaseConfig;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadConfig(): Config {
  return {
    bot: {
      TOKEN: requireEnv("BOT_TOKEN"),
      DEV_ID: Number(requireEnv("BOT_DEV_ID")),
      GROUP_ID: Number(requireEnv("BOT_GROUP_ID")),
      BOT_EMOJI_ID: requireEnv("BOT_EMOJI_ID"),
    },
    redis: {
      HOST: requireEnv("REDIS_HOST"),
      PORT: Number(requireEnv("REDIS_PORT")),
      DB: Number(requireEnv("REDIS_DB")),
    },
    supabase: {
      URL: requireEnv("SUPABASE_URL"),
      KEY: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    },
  };
}

export const config: Config = loadConfig();
