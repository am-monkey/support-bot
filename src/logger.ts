import pino from "pino";

export const logger = pino({
  level: "info",
  transport: {
    targets: [
      {
        target: "pino-pretty",
        level: "info",
        options: { colorize: true, translateTime: "SYS:standard" },
      },
      {
        target: "pino/file",
        level: "info",
        options: { destination: ".logs/bot.log", mkdir: true },
      },
    ],
  },
});
