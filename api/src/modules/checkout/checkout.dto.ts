import type { OrderStatus } from "@prisma/client";

export type CheckoutOrderItemDto = {
  id: string;
  variantId: string;
  productId: string;
  title: string;
  quantity: number;
  sizeMl: number;
  unitPricePaise: number;
  lineTotalPaise: number;
};

export type CheckoutOrderTotalsDto = {
  subtotalPaise: number;
  taxPaise: number;
  shippingPaise: number;
  discountPaise: number;
  totalPaise: number;
};

export type CheckoutOrderDto = {
  id: string;
  status: OrderStatus;
  notes: string | null;
  guestEmail: string | null;
  billingAddress: Record<string, unknown>;
  shippingAddress: Record<string, unknown>;
  totals: CheckoutOrderTotalsDto;
  items: CheckoutOrderItemDto[];
};

export type CheckoutResponseDto = {
  order: CheckoutOrderDto;
};
