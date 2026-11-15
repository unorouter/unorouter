import { IS_DEV } from "@/lib/config/constants";
import type { LogContext } from "@/lib/types";
import pino from "pino";

const base = pino({
  level: IS_DEV ? "debug" : "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export const logger = {
  info: (msg: string, ctx?: LogContext) => base.info(ctx ?? {}, msg),
  warn: (msg: string, ctx?: LogContext) => base.warn(ctx ?? {}, msg),
  error: (msg: string, ctx?: LogContext) => base.error(ctx ?? {}, msg),
  debug: (msg: string, ctx?: LogContext) => base.debug(ctx ?? {}, msg),
};
