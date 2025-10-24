import crypto from "node:crypto";

import { env } from "../../env";
import { createHttpError } from "../../middlewares/error";
import { logger } from "../../logger";

const RAZORPAY_BASE_URL = "https://api.razorpay.com/v1";

type RazorpayErrorResponse = {
  error?: {
    code?: string;
    description?: string;
    field?: string;
  };
};

export type RazorpayOrder = {
  id: string;
  entity: "order";
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string | null;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
};

export type RazorpayOrderPayload = {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
  paymentCapture?: boolean;
};

export type RazorpayPayment = {
  id: string;
  entity: "payment";
  amount: number;
  currency: string;
  status: string;
  method: string;
  order_id: string;
  invoice_id: string | null;
  international: boolean;
  captured: boolean;
  description: string | null;
  card_id: string | null;
  email: string | null;
  contact: string | null;
  notes: Record<string, unknown>;
  fee: number | null;
  tax: number | null;
  error_code: string | null;
  error_description: string | null;
  created_at: number;
};

function toBasicAuthHeader(): string {
  const credentials = `${env.razorpayKeyId}:${env.razorpayKeySecret}`;
  const encoded = Buffer.from(credentials).toString("base64");
  return `Basic ${encoded}`;
}

async function razorpayRequest<T>(
  path: string,
  init: RequestInit & { expect?: number[] } = {}
): Promise<T> {
  const expect = init.expect ?? [200];
  const method = init.method ?? "GET";
  logger.info("[razorpay] request -> %s %s (key=%s)", method, path, env.razorpayKeyId);
  const response = await fetch(`${RAZORPAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: toBasicAuthHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = text ? (isJson ? (JSON.parse(text) as unknown) : text) : null;
  logger.info(
    "[razorpay] response <- %s %s status=%d body=%s",
    method,
    path,
    response.status,
    text || "<empty>"
  );

  if (!expect.includes(response.status)) {
    const errorPayload = payload as RazorpayErrorResponse | null;
    const description =
      errorPayload?.error?.description ||
      (typeof payload === "string" ? payload : "Unexpected response from Razorpay");
    throw createHttpError(response.status, `Razorpay API error: ${description}`, {
      code: errorPayload?.error?.code,
      field: errorPayload?.error?.field,
    });
  }

  return payload as T;
}

export async function createRazorpayOrder(
  payload: RazorpayOrderPayload
): Promise<RazorpayOrder> {
  const body = {
    amount: payload.amount,
    currency: payload.currency ?? "INR",
    receipt: payload.receipt,
    notes: payload.notes ?? {},
    payment_capture: payload.paymentCapture === false ? 0 : 1,
  };

  return razorpayRequest<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify(body),
    expect: [200],
  });
}

export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  return razorpayRequest<RazorpayPayment>(`/payments/${paymentId}`, {
    method: "GET",
    expect: [200],
  });
}

function computePaymentSignature(orderId: string, paymentId: string): string {
  const hmac = crypto.createHmac("sha256", env.razorpayKeySecret);
  hmac.update(`${orderId}|${paymentId}`);
  return hmac.digest("hex");
}

export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const expectedSignature = computePaymentSignature(params.orderId, params.paymentId);
  return expectedSignature === params.signature;
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = env.razorpayWebhookSecret;
  if (!secret) {
    throw createHttpError(500, "RAZORPAY_WEBHOOK_SECRET is not configured");
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const digest = hmac.digest("hex");
  return digest === signature;
}
