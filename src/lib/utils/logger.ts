import pino from "pino";

const IS_DEV = process.env.NODE_ENV === "development";

const base = pino({
  level: IS_DEV ? "debug" : "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
});

type LogContext = { context?: string; [key: string]: unknown };

/**
 * Wraps pino to match the existing call convention: logger.info("message", { context, ... })
 * Pino natively expects (obj, msg), so we swap the arguments.
 */
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
