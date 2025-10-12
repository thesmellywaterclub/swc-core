"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    PORT: zod_1.z.coerce.number().int().positive().default(4000),
    CORS_ORIGINS: zod_1.z.string().optional(),
    DATABASE_URL: zod_1.z.string().optional(),
});
const parsed = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    CORS_ORIGINS: process.env.CORS_ORIGINS,
    DATABASE_URL: process.env.DATABASE_URL,
});
const corsOrigins = parsed.CORS_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];
exports.env = {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    corsOrigins,
    databaseUrl: parsed.DATABASE_URL,
};
