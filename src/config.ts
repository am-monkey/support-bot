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

export interface AiConfig {
  ANTHROPIC_API_KEY: string;
  VOYAGE_API_KEY: string;
  MODEL: string;
  EMBEDDING_MODEL: string;
  CONFIDENCE_THRESHOLD: number;
  TOP_K: number;
  MATCH_THRESHOLD: number;
}

export interface Config {
  bot: BotConfig;
  redis: RedisConfig;
  supabase: SupabaseConfig;
  ai: AiConfig;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
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
    ai: {
      ANTHROPIC_API_KEY: requireEnv("ANTHROPIC_API_KEY"),
      VOYAGE_API_KEY: requireEnv("VOYAGE_API_KEY"),
      MODEL: optionalEnv("AI_MODEL", "claude-opus-4-8"),
      EMBEDDING_MODEL: optionalEnv("AI_EMBEDDING_MODEL", "voyage-3.5"),
      CONFIDENCE_THRESHOLD: Number(optionalEnv("AI_CONFIDENCE_THRESHOLD", "0.7")),
      TOP_K: Number(optionalEnv("AI_TOP_K", "5")),
      MATCH_THRESHOLD: Number(optionalEnv("AI_MATCH_THRESHOLD", "0.4")),
    },
  };
}

export const config: Config = loadConfig();
