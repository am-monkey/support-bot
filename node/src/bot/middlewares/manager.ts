import type { MiddlewareFn } from "grammy";

import type { MyContext } from "../../types";
import { Manager } from "../manager";

/** Creates a Manager for the current update. Mirrors the Python ManagerMiddleware. */
export const managerMiddleware: MiddlewareFn<MyContext> = async (ctx, next) => {
  const languageCode = ctx.session.language_code ?? ctx.from?.language_code;
  ctx.manager = new Manager(ctx, languageCode);
  await next();
};
