import type { Request } from "express";

import { asyncHandler } from "../../utils/asyncHandler";
import { createHttpError } from "../../middlewares/error";
import type { PaymentSessionBody, PaymentConfirmationBody } from "./payments.schemas";
import {
  paymentOrderParamSchema,
  paymentSessionBodySchema,
  paymentConfirmationBodySchema,
} from "./payments.schemas";
import { confirmRazorpayPayment, createPaymentSession } from "./payments.service";

type RequestWithAuth = Request & {
  auth?: {
    userId: string;
    email: string;
    sellerId: string | null;
    isAdmin: boolean;
  };
};

export const createRazorpaySessionHandler = asyncHandler(async (req, res) => {
  const request = req as RequestWithAuth;
  const { orderId } = paymentOrderParamSchema.parse(req.params);
  const body = paymentSessionBodySchema.parse(req.body) as PaymentSessionBody;
  const auth = request.auth;
  const guestEmail = body.guestEmail ?? null;

  if (!auth?.userId && !guestEmail) {
    throw createHttpError(400, "guestEmail is required when creating a payment session as a guest");
  }

  const session = await createPaymentSession(orderId, {
    userId: auth?.userId,
    email: body.contact?.email ?? auth?.email ?? guestEmail,
    phone: body.contact?.phone ?? null,
    name: body.contact?.name ?? null,
    guestEmail: guestEmail,
  });

  res.json({ data: session });
});

export const confirmRazorpayPaymentHandler = asyncHandler(async (req, res) => {
  const request = req as RequestWithAuth;
  const { orderId } = paymentOrderParamSchema.parse(req.params);
  const body = paymentConfirmationBodySchema.parse(req.body) as PaymentConfirmationBody;
  const auth = request.auth;
  const guestEmail = body.guestEmail ?? null;

  if (!auth?.userId && !guestEmail) {
    throw createHttpError(400, "guestEmail is required when confirming a payment as a guest");
  }

  const result = await confirmRazorpayPayment(
    orderId,
    {
      userId: auth?.userId,
      email: auth?.email ?? guestEmail,
      guestEmail,
    },
    {
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
      razorpaySignature: body.razorpaySignature,
    }
  );

  res.json({ data: result });
});
