import type { OrderStatus, Prisma } from "@prisma/client";

import { sendEmail } from "../../services/email/email.service";

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const ORDER_EMAIL_INCLUDE = {
  items: {
    include: {
      variant: {
        include: {
          product: true,
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

export type OrderEmailRecord = Prisma.OrderGetPayload<{
  include: typeof ORDER_EMAIL_INCLUDE;
}>;

export function formatCurrencyPaise(paise: number): string {
  return CURRENCY_FORMATTER.format(paise);
}

export function formatOrderNumber(orderId: string): string {
  const [prefix] = orderId.split("-");
  return (prefix ?? orderId).toUpperCase();
}

export function buildFullName(
  firstName?: string | null,
  lastName?: string | null
): string | null {
  const parts = [firstName?.trim(), lastName?.trim()].filter(
    (part): part is string => Boolean(part && part.length > 0)
  );
  if (parts.length === 0) {
    return null;
  }
  return parts.join(" ");
}

export type OrderEmailOptions = {
  recipientEmail: string;
  customerName: string;
  supportEmail?: string;
  viewOrderUrl?: string;
  paymentStatusLabel?: string;
  paymentStatusNote?: string;
  orderStatus?: OrderStatus;
};

export async function sendOrderConfirmationEmail(
  order: OrderEmailRecord,
  options: OrderEmailOptions
): Promise<void> {
  await sendEmail({
    to: options.recipientEmail,
    type: "orderConfirmation",
    data: {
      customerName: options.customerName,
      orderNumber: formatOrderNumber(order.id),
      orderDate: new Intl.DateTimeFormat("en-IN", {
        dateStyle: "long",
      }).format(order.createdAt),
      items: order.items.map((item) => ({
        name: item.variant.product.title,
        quantity: item.quantity,
        price: formatCurrencyPaise(item.lineTotalPaise),
      })),
      subtotal: formatCurrencyPaise(order.subtotalPaise),
      shipping: formatCurrencyPaise(order.shippingPaise),
      tax: formatCurrencyPaise(order.taxPaise),
      total: formatCurrencyPaise(order.totalPaise),
      supportEmail: options.supportEmail,
      viewOrderUrl: options.viewOrderUrl,
      paymentStatusLabel: options.paymentStatusLabel,
      paymentStatusNote: options.paymentStatusNote,
      orderStatus: options.orderStatus ?? order.status,
    },
  });
}
