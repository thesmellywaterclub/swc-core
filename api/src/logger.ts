import util from "node:util";

import { env } from "./env";

type LogLevel = "debug" | "info" | "warn" | "error";

const logWriters: Record<Exclude<LogLevel, "debug">, (...args: unknown[]) => void> = {
  info: console.log,
  warn: console.warn,
  error: console.error,
};

const shouldLogDebug = env.nodeEnv !== "production";

function formatMessage(message: unknown, extra: unknown[]): string {
  if (typeof message === "string" && extra.length === 0) {
    return message;
  }

  return util.format(message as string, ...extra);
}

function log(level: LogLevel, message: unknown, ...extra: unknown[]) {
  if (level === "debug" && !shouldLogDebug) {
    return;
  }

  const timestamp = new Date().toISOString();
  const payload = formatMessage(message, extra);

  if (level === "debug") {
    console.debug(`[${timestamp}] [DEBUG] ${payload}`);
    return;
  }

  const writer = logWriters[level];
  writer(`[${timestamp}] [${level.toUpperCase()}] ${payload}`);
}

export const logger = {
  debug: (message: unknown, ...extra: unknown[]) => log("debug", message, ...extra),
  info: (message: unknown, ...extra: unknown[]) => log("info", message, ...extra),
  warn: (message: unknown, ...extra: unknown[]) => log("warn", message, ...extra),
  error: (message: unknown, ...extra: unknown[]) => log("error", message, ...extra),
};

export type Logger = typeof logger;
