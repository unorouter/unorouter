import { IS_DEV } from "@/lib/config/constants";
import type { LogContext } from "@/lib/types";
import pino from "pino";

const base = pino({
  level: IS_DEV ? "debug" : "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
});

/** Wraps pino; swaps (obj,msg)->(msg,obj). */
export const logger = {
  info: (msg: string, ctx?: LogContext) => base.info(ctx ?? {}, msg),
  warn: (msg: string, ctx?: LogContext) => base.warn(ctx ?? {}, msg),
  error: (msg: string, ctx?: LogContext) => base.error(ctx ?? {}, msg),
  debug: (msg: string, ctx?: LogContext) => base.debug(ctx ?? {}, msg),
  child: (bindings: Record<string, unknown>) => {
    const child = base.child(bindings);
    return {
      info: (msg: string, ctx?: LogContext) => child.info(ctx ?? {}, msg),
      warn: (msg: string, ctx?: LogContext) => child.warn(ctx ?? {}, msg),
      error: (msg: string, ctx?: LogContext) => child.error(ctx ?? {}, msg),
      debug: (msg: string, ctx?: LogContext) => child.debug(ctx ?? {}, msg),
    };
  },
};
