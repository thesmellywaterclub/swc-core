import type { OrderStatus, PaymentStatus } from "@prisma/client";

export type PaymentSessionCustomerDto = {
  name: string | null;
  email: string | null;
  contact: string | null;
};

export type PaymentSessionDto = {
  orderId: string;
  amountPaise: number;
  currency: string;
  razorpayOrderId: string;
  razorpayKeyId: string;
  receipt: string | null;
  customer: PaymentSessionCustomerDto;
};

export type PaymentConfirmationDto = {
  orderId: string;
  paymentId: string;
  status: PaymentStatus;
  method: string | null;
  amountPaise: number;
  orderStatus: OrderStatus;
};
