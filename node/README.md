# Support Bot (Node.js / grammY)

Node.js/TypeScript port of the aiogram support bot, built on [grammY](https://grammy.dev).
A user writes the bot in private; the bot opens a forum topic in the support group and
relays messages both ways. Supports ban/silent modes, subscription info (Supabase),
media groups, instant newsletter broadcast, throttling, and en/ru localization.

## Run locally

```bash
cd node
cp .env.example .env   # fill in real values
npm install
npm run dev            # watch mode
```

## Build & run

```bash
npm run build
npm start
```

## Docker

```bash
docker compose up --build
```

Uses Redis (sessions + user storage, schema-compatible with the Python bot:
`users` hash and `users_index_*` hashes) and Supabase (read-only subscription lookup).

## Newsletter

Admin-only. Send `/newsletter your text` or reply to a message with `/newsletter`;
the bot broadcasts it to all known users immediately (no scheduling).
