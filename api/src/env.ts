import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().optional(),
  DATABASE_URL: z.string().optional(),
});

const parsed = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  CORS_ORIGINS: process.env.CORS_ORIGINS,
  DATABASE_URL: process.env.DATABASE_URL,
});

const corsOrigins =
  parsed.CORS_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];

export const env = {
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  corsOrigins,
  databaseUrl: parsed.DATABASE_URL,
};

export type AppEnv = typeof env;
