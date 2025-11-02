export type ProductGender = "unisex" | "men" | "women" | "other";

export type ProductBrand = {
  id: string;
  name: string;
};

export type ProductMedia = {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type ProductVariantInventory = {
  stock: number;
  reserved: number;
};

export type VariantBestOffer = {
  offerId: string;
  price: number;
  sellerId: string;
  sellerName: string | null;
  sellerDisplayName: string | null;
  sellerLocationLabel: string;
  stockQty: number;
  condition: "NEW" | "OPEN_BOX" | "TESTER";
  authGrade: "SEALED" | "STORE_BILL" | "VERIFIED_UNKNOWN";
  computedAt: string;
};

export type ProductVariant = {
  id: string;
  sku: string;
  sizeMl: number;
  mrpPaise: number;
  salePaise: number | null;
  isActive: boolean;
  inventory: ProductVariantInventory | null;
  bestOffer: VariantBestOffer | null;
};

export type ProductNotes = {
  top: string[];
  heart: string[];
  base: string[];
};

export type ProductAggregates = {
  ratingAvg: number;
  ratingCount: number;
  reviewCount: number;
  lowPricePaise: number | null;
  inStockVariants: number;
};

export type Product = {
  id: string;
  slug: string;
  title: string;
  gender: ProductGender;
  brand: ProductBrand;
  notes: ProductNotes;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  media: ProductMedia[];
  variants: ProductVariant[];
  aggregates: ProductAggregates;
};
