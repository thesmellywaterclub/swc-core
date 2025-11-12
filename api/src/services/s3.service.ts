import { randomUUID } from "node:crypto";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "../env";
import { logger } from "../logger";

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const s3Client = new S3Client({
  region: env.awsRegion,
  credentials: {
    accessKeyId: env.awsAccessKeyId,
    secretAccessKey: env.awsSecretAccessKey,
  },
});

const PRODUCT_MEDIA_PREFIX = "products";

type PresignOptions = {
  productId: string;
  contentType: string;
  fileName?: string;
};

function resolveExtension(contentType: string): string {
  const extension = ALLOWED_IMAGE_TYPES[contentType];
  if (!extension) {
    throw new Error("Unsupported content type. Allowed: JPEG, PNG, WEBP.");
  }
  return extension;
}

function buildObjectKey(productId: string, extension: string) {
  return `${PRODUCT_MEDIA_PREFIX}/${productId}/${randomUUID()}.${extension}`;
}

function buildPublicUrl(key: string) {
  const base =
    env.s3PublicUrl?.replace(/\/+$/, "") ??
    `https://${env.s3BucketName}.s3.${env.awsRegion}.amazonaws.com`;
  return `${base}/${key}`;
}

export async function createProductMediaUpload({
  productId,
  contentType,
  fileName: _fileName,
}: PresignOptions) {
  void _fileName;
  const extension = resolveExtension(contentType);
  const key = buildObjectKey(productId, extension);

  const command = new PutObjectCommand({
    Bucket: env.s3BucketName,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 120 });
  const fileUrl = buildPublicUrl(key);

  return { uploadUrl, fileUrl, key };
}

function extractKeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const bucketHost = `${env.s3BucketName}.s3.${env.awsRegion}.amazonaws.com`;
    if (parsed.hostname === bucketHost) {
      return parsed.pathname.replace(/^\/+/, "");
    }
    if (env.s3PublicUrl) {
      const publicHost = new URL(env.s3PublicUrl);
      if (parsed.hostname === publicHost.hostname) {
        return parsed.pathname.replace(/^\/+/, "");
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function deleteObjectByUrl(url: string) {
  const key = extractKeyFromUrl(url);
  if (!key) {
    return;
  }

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: env.s3BucketName,
        Key: key,
      }),
    );
  } catch (error) {
    logger.warn(
      { error },
      `Failed to delete object ${key} from bucket ${env.s3BucketName}`,
    );
  }
}
