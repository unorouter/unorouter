type LogLevel = "info" | "warn" | "error";

type LogContext = {
  context?: string;
  [key: string]: unknown;
};

function formatLog(level: LogLevel, message: string, ctx?: LogContext): string {
  const timestamp = new Date().toISOString();
  const parts = [timestamp, level.toUpperCase(), message];
  if (ctx) parts.push(JSON.stringify(ctx));
  return parts.join(" | ");
}

export const logger = {
  info(message: string, ctx?: LogContext) {
    console.log(formatLog("info", message, ctx));
  },
  warn(message: string, ctx?: LogContext) {
    console.warn(formatLog("warn", message, ctx));
  },
  error(message: string, ctx?: LogContext) {
    console.error(formatLog("error", message, ctx));
  },
};
