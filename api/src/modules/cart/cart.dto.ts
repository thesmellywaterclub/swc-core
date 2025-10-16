export type CartBrandDto = {
  id: string;
  name: string;
};

export type CartProductDto = {
  id: string;
  slug: string;
  title: string;
  brand: CartBrandDto;
};

export type CartVariantDto = {
  id: string;
  sku: string;
  sizeMl: number;
  mrpPaise: number;
  salePaise: number | null;
};

export type CartItemDto = {
  variantId: string;
  quantity: number;
  variant: CartVariantDto;
  product: CartProductDto;
  lineTotalPaise: number;
};

export type CartTotalsDto = {
  itemCount: number;
  subtotalPaise: number;
};

export type CartDto = {
  id: string;
  userId: string | null;
  guestToken: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  items: CartItemDto[];
  totals: CartTotalsDto;
};

export type CartResponse = {
  cart: CartDto;
  guestToken: string | null;
};
