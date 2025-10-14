import { z } from "zod";

const DEFAULT_JWT_SECRET = "development-jwt-secret-please-change-0123456789abcd";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long")
    .default(DEFAULT_JWT_SECRET),
  JWT_EXPIRES_IN: z.string().default("15m"),
});

const parsed = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  CORS_ORIGINS: process.env.CORS_ORIGINS,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
});

const corsOrigins =
  parsed.CORS_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];

export const env = {
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  corsOrigins,
  databaseUrl: parsed.DATABASE_URL,
  jwtSecret: parsed.JWT_SECRET,
  jwtExpiresIn: parsed.JWT_EXPIRES_IN,
};

export type AppEnv = typeof env;
