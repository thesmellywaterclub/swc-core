import type { OrderStatus, ShipmentStatus, PaymentStatus } from "@prisma/client";

export type OrderItemDto = {
  id: string;
  variantId: string;
  productId: string;
  title: string;
  sizeMl: number;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
};

export type ShipmentSummaryDto = {
  id: string;
  trackingNumber: string | null;
  status: ShipmentStatus;
};

export type OrderSummaryDto = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  totalPaise: number;
  itemCount: number;
};

export type OrderDetailDto = OrderSummaryDto & {
  notes: string | null;
  guestEmail: string | null;
  billingAddress: Record<string, unknown>;
  shippingAddress: Record<string, unknown>;
  subtotalPaise: number;
  taxPaise: number;
  shippingPaise: number;
  discountPaise: number;
  items: OrderItemDto[];
  shipments: ShipmentSummaryDto[];
  paymentStatus: PaymentStatus | null;
};

export type OrderListResponse = {
  data: OrderSummaryDto[];
  meta: {
    nextCursor: string | null;
  };
};

export type OrderDetailResponse = {
  data: OrderDetailDto;
};
