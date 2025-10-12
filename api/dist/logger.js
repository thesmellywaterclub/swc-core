"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const node_util_1 = __importDefault(require("node:util"));
const env_1 = require("./env");
const logWriters = {
    info: console.log,
    warn: console.warn,
    error: console.error,
};
const shouldLogDebug = env_1.env.nodeEnv !== "production";
function formatMessage(message, extra) {
    if (typeof message === "string" && extra.length === 0) {
        return message;
    }
    return node_util_1.default.format(message, ...extra);
}
function log(level, message, ...extra) {
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
exports.logger = {
    debug: (message, ...extra) => log("debug", message, ...extra),
    info: (message, ...extra) => log("info", message, ...extra),
    warn: (message, ...extra) => log("warn", message, ...extra),
    error: (message, ...extra) => log("error", message, ...extra),
};
