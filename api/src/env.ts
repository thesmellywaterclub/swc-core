import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const DEFAULT_JWT_SECRET = "development-jwt-secret-please-change-0123456789abcd";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().min(1, "RAZORPAY_KEY_ID is required"),
  RAZORPAY_KEY_SECRET: z.string().min(1, "RAZORPAY_KEY_SECRET is required"),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long")
    .default(DEFAULT_JWT_SECRET),
  JWT_EXPIRES_IN: z.string().default("15m"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  EMAIL_FROM: z
    .string()
    .min(1, "EMAIL_FROM is required")
    .default("support@thesmellywaterclub.com"),
  DELHIVERY_API_URL: z
    .string()
    .url("DELHIVERY_API_URL must be a valid URL")
    .default("https://track.delhivery.com"),
  DELHIVERY_API_TOKEN: z.string().min(1, "DELHIVERY_API_TOKEN is required"),
  AWS_ACCESS_KEY_ID: z.string().min(1, "AWS_ACCESS_KEY_ID is required"),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS_SECRET_ACCESS_KEY is required"),
  AWS_REGION: z.string().min(1, "AWS_REGION is required"),
  S3_BUCKET_NAME: z.string().min(1, "S3_BUCKET_NAME is required"),
  S3_PUBLIC_URL: z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed && trimmed.length > 0 ? trimmed : undefined;
    })
    .refine(
      (value) => !value || (() => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      })(),
      "S3_PUBLIC_URL must be a valid URL"
    )
    .optional(),
});

const parsed = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  CORS_ORIGINS: process.env.CORS_ORIGINS,
  DATABASE_URL: process.env.DATABASE_URL,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  DELHIVERY_API_URL: process.env.DELHIVERY_API_URL,
  DELHIVERY_API_TOKEN: process.env.DELHIVERY_API_TOKEN,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  S3_PUBLIC_URL: process.env.S3_PUBLIC_URL,
});

const corsOrigins =
  parsed.CORS_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];

export const env = {
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  corsOrigins,
  databaseUrl: parsed.DATABASE_URL,
  razorpayKeyId: parsed.RAZORPAY_KEY_ID,
  razorpayKeySecret: parsed.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: parsed.RAZORPAY_WEBHOOK_SECRET ?? null,
  jwtSecret: parsed.JWT_SECRET,
  jwtExpiresIn: parsed.JWT_EXPIRES_IN,
  resendApiKey: parsed.RESEND_API_KEY,
  emailFrom: parsed.EMAIL_FROM,
  delhiveryApiUrl: parsed.DELHIVERY_API_URL,
  delhiveryApiToken: parsed.DELHIVERY_API_TOKEN,
  awsAccessKeyId: parsed.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: parsed.AWS_SECRET_ACCESS_KEY,
  awsRegion: parsed.AWS_REGION,
  s3BucketName: parsed.S3_BUCKET_NAME,
  s3PublicUrl: parsed.S3_PUBLIC_URL ?? null,
};

export type AppEnv = typeof env;
