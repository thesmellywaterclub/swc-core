import type {
  Product,
  ProductGender,
  ProductNotes,
  ProductVariant,
  ProductVariantInventory,
} from "./products.dto";

const brands = {
  dior: {
    id: "brand-dior",
    name: "Dior",
  },
  chanel: {
    id: "brand-chanel",
    name: "Chanel",
  },
} as const;

type BrandKey = keyof typeof brands;

type MediaSeed = {
  id: string;
  url: string;
  alt?: string | null;
  sortOrder: number;
  isPrimary?: boolean;
};

type VariantSeed = {
  id: string;
  sku: string;
  sizeMl: number;
  mrpPaise: number;
  salePaise?: number | null;
  stock: number;
  reserved?: number;
  isActive?: boolean;
};

type ProductSeed = {
  id: string;
  slug: string;
  title: string;
  gender: ProductGender;
  brand: BrandKey;
  notes: ProductNotes;
  description: string;
  createdAt: string;
  updatedAt: string;
  media: MediaSeed[];
  variants: VariantSeed[];
  ratingAvg: number;
  ratingCount: number;
  reviewCount?: number;
};

function buildVariant(seed: VariantSeed): ProductVariant {
  const inventory: ProductVariantInventory | null =
    seed.stock > 0 || seed.reserved
      ? {
          stock: seed.stock,
          reserved: seed.reserved ?? 0,
        }
      : null;

  return {
    id: seed.id,
    sku: seed.sku,
    sizeMl: seed.sizeMl,
    mrpPaise: seed.mrpPaise,
    salePaise: seed.salePaise ?? null,
    isActive: seed.isActive ?? seed.stock > 0,
    inventory,
  };
}

function coerceMedia(seed: MediaSeed) {
  return {
    id: seed.id,
    url: seed.url,
    alt: seed.alt ?? null,
    sortOrder: seed.sortOrder,
    isPrimary: seed.isPrimary ?? seed.sortOrder === 0,
  };
}

const commonTimestamp = "2024-01-15T10:00:00.000Z";

const productSeeds: ProductSeed[] = [
  {
    id: "prod-dior-sauvage-edt",
    slug: "dior-sauvage-eau-de-toilette",
    title: "Dior Sauvage Eau de Toilette",
    gender: "men",
    brand: "dior",
    notes: {
      top: ["Calabrian Bergamot", "Pepper"],
      heart: ["Lavender", "Geranium"],
      base: ["Ambroxan", "Cedar"],
    },
    description:
      "Sauvage Eau de Toilette captures raw freshness with vibrant bergamot and a powerful trail of Ambroxan.",
    createdAt: commonTimestamp,
    updatedAt: commonTimestamp,
    media: [
      {
        id: "media-dior-sauvage-edt-1",
        url: "https://images.unsplash.com/photo-1612810806695-30ba71080906?auto=format&fit=crop&w=1080&q=80",
        alt: "Bottle of Dior Sauvage Eau de Toilette on a dark surface",
        sortOrder: 0,
        isPrimary: true,
      },
      {
        id: "media-dior-sauvage-edt-2",
        url: "https://images.unsplash.com/photo-1629725254852-713a1a996a96?auto=format&fit=crop&w=1080&q=80",
        alt: "Dior Sauvage Eau de Toilette bottle next to citrus slices",
        sortOrder: 1,
      },
    ],
    variants: [
      {
        id: "variant-dior-sauvage-edt-60",
        sku: "DSAUV-EDT-60ML",
        sizeMl: 60,
        mrpPaise: 99,
        stock: 25,
      },
      {
        id: "variant-dior-sauvage-edt-100",
        sku: "DSAUV-EDT-100ML",
        sizeMl: 100,
        mrpPaise: 125,
        stock: 18,
      },
      {
        id: "variant-dior-sauvage-edt-200",
        sku: "DSAUV-EDT-200ML",
        sizeMl: 200,
        mrpPaise: 175,
        stock: 10,
      },
    ],
    ratingAvg: 4.8,
    ratingCount: 1021,
  },
  {
    id: "prod-dior-sauvage-edp",
    slug: "dior-sauvage-eau-de-parfum",
    title: "Dior Sauvage Eau de Parfum",
    gender: "men",
    brand: "dior",
    notes: {
      top: ["Bergamot"],
      heart: ["Nutmeg", "Lavender"],
      base: ["Vanilla", "Cedar"],
    },
    description:
      "Sauvage Eau de Parfum deepens the signature freshness with warm vanilla and sensual woods.",
    createdAt: commonTimestamp,
    updatedAt: commonTimestamp,
    media: [
      {
        id: "media-dior-sauvage-edp-1",
        url: "https://images.unsplash.com/photo-1619045119200-8c2d0950618d?auto=format&fit=crop&w=1080&q=80",
        alt: "Bottle of Dior Sauvage Eau de Parfum in moody lighting",
        sortOrder: 0,
        isPrimary: true,
      },
      {
        id: "media-dior-sauvage-edp-2",
        url: "https://images.unsplash.com/photo-1619728913095-e9e75ae04bb9?auto=format&fit=crop&w=1080&q=80",
        alt: "Close-up of Dior Sauvage Eau de Parfum bottle",
        sortOrder: 1,
      },
    ],
    variants: [
      {
        id: "variant-dior-sauvage-edp-60",
        sku: "DSAUV-EDP-60ML",
        sizeMl: 60,
        mrpPaise: 115,
        stock: 20,
      },
      {
        id: "variant-dior-sauvage-edp-100",
        sku: "DSAUV-EDP-100ML",
        sizeMl: 100,
        mrpPaise: 145,
        stock: 14,
      },
    ],
    ratingAvg: 4.7,
    ratingCount: 864,
  },
  {
    id: "prod-dior-sauvage-parfum",
    slug: "dior-sauvage-parfum",
    title: "Dior Sauvage Parfum",
    gender: "men",
    brand: "dior",
    notes: {
      top: ["Bergamot", "Mandarin"],
      heart: ["Olibanum", "Lavender"],
      base: ["Sandalwood", "Cedar"],
    },
    description:
      "Sauvage Parfum is a refined take with dense woods and smooth tonka, amplifying the iconic trail.",
    createdAt: commonTimestamp,
    updatedAt: commonTimestamp,
    media: [
      {
        id: "media-dior-sauvage-parfum-1",
        url: "https://images.unsplash.com/photo-1619724311467-0b676a3d4090?auto=format&fit=crop&w=1080&q=80",
        alt: "Dior Sauvage Parfum bottle on a reflective surface",
        sortOrder: 0,
        isPrimary: true,
      },
      {
        id: "media-dior-sauvage-parfum-2",
        url: "https://images.unsplash.com/photo-1629725254458-9fa4f14fd9d7?auto=format&fit=crop&w=1080&q=80",
        alt: "Dior Sauvage Parfum bottle against a textured background",
        sortOrder: 1,
      },
    ],
    variants: [
      {
        id: "variant-dior-sauvage-parfum-75",
        sku: "DSAUV-PARFUM-75ML",
        sizeMl: 75,
        mrpPaise: 150,
        stock: 12,
      },
      {
        id: "variant-dior-sauvage-parfum-100",
        sku: "DSAUV-PARFUM-100ML",
        sizeMl: 100,
        mrpPaise: 180,
        stock: 9,
      },
    ],
    ratingAvg: 4.9,
    ratingCount: 521,
  },
  {
    id: "prod-dior-sauvage-elixir",
    slug: "dior-sauvage-elixir",
    title: "Dior Sauvage Elixir",
    gender: "men",
    brand: "dior",
    notes: {
      top: ["Grapefruit", "Cinnamon"],
      heart: ["Lavender", "Nutmeg"],
      base: ["Licorice", "Vetiver", "Sandalwood"],
    },
    description:
      "Sauvage Elixir pushes the blend to powerful heights with rich spices and deep woods.",
    createdAt: commonTimestamp,
    updatedAt: commonTimestamp,
    media: [
      {
        id: "media-dior-sauvage-elixir-1",
        url: "https://images.unsplash.com/photo-1619725254458-9fa4f14fd9d7?auto=format&fit=crop&w=1080&q=80",
        alt: "Dior Sauvage Elixir bottle with dramatic shadows",
        sortOrder: 0,
        isPrimary: true,
      },
      {
        id: "media-dior-sauvage-elixir-2",
        url: "https://images.unsplash.com/photo-1619724311467-0b676a3d4090?auto=format&fit=crop&w=1080&q=80",
        alt: "Alternate view of Dior Sauvage Elixir bottle",
        sortOrder: 1,
      },
    ],
    variants: [
      {
        id: "variant-dior-sauvage-elixir-60",
        sku: "DSAUV-ELIXIR-60ML",
        sizeMl: 60,
        mrpPaise: 195,
        stock: 6,
      },
    ],
    ratingAvg: 4.9,
    ratingCount: 389,
  },
  {
    id: "prod-bleu-de-chanel-edt",
    slug: "bleu-de-chanel-eau-de-toilette",
    title: "Bleu De Chanel Eau de Toilette",
    gender: "men",
    brand: "chanel",
    notes: {
      top: ["Lemon", "Grapefruit", "Peppermint"],
      heart: ["Cedar", "Dry Amber"],
      base: ["Sandalwood", "Patchouli"],
    },
    description:
      "Bleu De Chanel EDT blends sparkling citrus with aromatic woods for an all-occasion signature.",
    createdAt: commonTimestamp,
    updatedAt: commonTimestamp,
    media: [
      {
        id: "media-bleu-edt-1",
        url: "https://images.unsplash.com/photo-1505575967455-40e256f73376?auto=format&fit=crop&w=1080&q=80",
        alt: "Bleu De Chanel Eau de Toilette bottle on a stone surface",
        sortOrder: 0,
        isPrimary: true,
      },
      {
        id: "media-bleu-edt-2",
        url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1080&q=80",
        alt: "Bleu De Chanel Eau de Toilette with incense smoke",
        sortOrder: 1,
      },
    ],
    variants: [
      {
        id: "variant-bleu-edt-50",
        sku: "BDC-EDT-50ML",
        sizeMl: 50,
        mrpPaise: 95,
        stock: 30,
      },
      {
        id: "variant-bleu-edt-100",
        sku: "BDC-EDT-100ML",
        sizeMl: 100,
        mrpPaise: 120,
        stock: 20,
      },
      {
        id: "variant-bleu-edt-150",
        sku: "BDC-EDT-150ML",
        sizeMl: 150,
        mrpPaise: 150,
        stock: 12,
      },
    ],
    ratingAvg: 4.7,
    ratingCount: 932,
  },
  {
    id: "prod-bleu-de-chanel-edp",
    slug: "bleu-de-chanel-eau-de-parfum",
    title: "Bleu De Chanel Eau de Parfum",
    gender: "men",
    brand: "chanel",
    notes: {
      top: ["Citrus Zest"],
      heart: ["Cedar", "Lavender"],
      base: ["Amber", "Sandalwood"],
    },
    description:
      "Bleu De Chanel EDP warms the original freshness with velvety amber woods for evening sophistication.",
    createdAt: commonTimestamp,
    updatedAt: commonTimestamp,
    media: [
      {
        id: "media-bleu-edp-1",
        url: "https://images.unsplash.com/photo-1511288598956-4c19c0cb8b8f?auto=format&fit=crop&w=1080&q=80",
        alt: "Bleu De Chanel Eau de Parfum bottle on a marble surface",
        sortOrder: 0,
        isPrimary: true,
      },
      {
        id: "media-bleu-edp-2",
        url: "https://images.unsplash.com/photo-1517089596392-fb9a9033e05b?auto=format&fit=crop&w=1080&q=80",
        alt: "Bleu De Chanel Eau de Parfum bottle with soft lighting",
        sortOrder: 1,
      },
    ],
    variants: [
      {
        id: "variant-bleu-edp-50",
        sku: "BDC-EDP-50ML",
        sizeMl: 50,
        mrpPaise: 115,
        stock: 22,
      },
      {
        id: "variant-bleu-edp-100",
        sku: "BDC-EDP-100ML",
        sizeMl: 100,
        mrpPaise: 145,
        stock: 14,
      },
    ],
    ratingAvg: 4.8,
    ratingCount: 845,
  },
  {
    id: "prod-bleu-de-chanel-parfum",
    slug: "bleu-de-chanel-parfum",
    title: "Bleu De Chanel Parfum",
    gender: "men",
    brand: "chanel",
    notes: {
      top: ["Citrus", "Aromatics"],
      heart: ["Cedar", "Geranium"],
      base: ["Sandalwood", "Tonka Bean"],
    },
    description:
      "Bleu De Chanel Parfum is a creamy, full-bodied interpretation with smooth sandalwood and tonka bean.",
    createdAt: commonTimestamp,
    updatedAt: commonTimestamp,
    media: [
      {
        id: "media-bleu-parfum-1",
        url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1080&q=80",
        alt: "Bleu De Chanel Parfum bottle on a muted blue background",
        sortOrder: 0,
        isPrimary: true,
      },
      {
        id: "media-bleu-parfum-2",
        url: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=1080&q=80",
        alt: "Bleu De Chanel Parfum bottle with blurred lights",
        sortOrder: 1,
      },
    ],
    variants: [
      {
        id: "variant-bleu-parfum-75",
        sku: "BDC-PARFUM-75ML",
        sizeMl: 75,
        mrpPaise: 155,
        stock: 14,
      },
      {
        id: "variant-bleu-parfum-100",
        sku: "BDC-PARFUM-100ML",
        sizeMl: 100,
        mrpPaise: 195,
        stock: 9,
      },
    ],
    ratingAvg: 4.9,
    ratingCount: 612,
  },
  {
    id: "prod-bleu-de-chanel-lexclusif",
    slug: "bleu-de-chanel-lexclusif",
    title: "Bleu De Chanel L'Exclusif",
    gender: "men",
    brand: "chanel",
    notes: {
      top: ["Grapefruit", "Lemon Zest"],
      heart: ["Cedar", "Vetiver"],
      base: ["Musk", "Frankincense"],
    },
    description:
      "Bleu De Chanel L'Exclusif is a boutique edition with heightened woods and smoky incense nuances.",
    createdAt: commonTimestamp,
    updatedAt: commonTimestamp,
    media: [
      {
        id: "media-bleu-lexclusif-1",
        url: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1080&q=80",
        alt: "Bleu De Chanel L'Exclusif bottle with dramatic lighting",
        sortOrder: 0,
        isPrimary: true,
      },
      {
        id: "media-bleu-lexclusif-2",
        url: "https://images.unsplash.com/photo-1524592094895-175005dcfb58?auto=format&fit=crop&w=1080&q=80",
        alt: "Bleu De Chanel L'Exclusif bottle next to cedar branches",
        sortOrder: 1,
      },
    ],
    variants: [
      {
        id: "variant-bleu-lexclusif-75",
        sku: "BDC-LEX-75ML",
        sizeMl: 75,
        mrpPaise: 210,
        stock: 5,
      },
    ],
    ratingAvg: 4.95,
    ratingCount: 211,
  },
  {
    id: "prod-miss-dior-edp",
    slug: "miss-dior",
    title: "Miss Dior Eau de Parfum",
    gender: "women",
    brand: "dior",
    notes: {
      top: ["Peony", "Italian Mandarin"],
      heart: ["Grasse Rose", "Lily-of-the-Valley"],
      base: ["Soft Musk"],
    },
    description:
      "Miss Dior is a blooming bouquet of Grasse rose, luminous peony, and whispering musk that wraps the wearer like couture.",
    createdAt: commonTimestamp,
    updatedAt: commonTimestamp,
    media: [
      {
        id: "media-miss-dior-1",
        url: "https://images.unsplash.com/photo-1611608821984-75b1da00537c?auto=format&fit=crop&w=1080&q=80",
        alt: "Miss Dior Eau de Parfum bottle with pink satin ribbon",
        sortOrder: 0,
        isPrimary: true,
      },
      {
        id: "media-miss-dior-2",
        url: "https://images.unsplash.com/photo-1511288598956-4c19c0cb8b8f?auto=format&fit=crop&w=1080&q=80",
        alt: "Miss Dior Eau de Parfum bottle surrounded by flowers",
        sortOrder: 1,
      },
      {
        id: "media-miss-dior-3",
        url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1080&q=80",
        alt: "Close-up of Miss Dior Eau de Parfum bottle",
        sortOrder: 2,
      },
      {
        id: "media-miss-dior-4",
        url: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=1080&q=80",
        alt: "Miss Dior bottle placed on a dressing table",
        sortOrder: 3,
      },
    ],
    variants: [
      {
        id: "variant-miss-dior-50",
        sku: "MISS-DIOR-50ML",
        sizeMl: 50,
        mrpPaise: 110,
        stock: 20,
      },
      {
        id: "variant-miss-dior-100",
        sku: "MISS-DIOR-100ML",
        sizeMl: 100,
        mrpPaise: 150,
        stock: 12,
      },
    ],
    ratingAvg: 4.6,
    ratingCount: 402,
  },
];

const products: Product[] = productSeeds.map((seed) => {
  const variants = seed.variants.map(buildVariant);
  const media = seed.media.map(coerceMedia).sort((a, b) => a.sortOrder - b.sortOrder);

  const activeVariants = variants.filter((variant) => variant.isActive);
  const pricedVariants = activeVariants
    .map((variant) => variant.salePaise ?? variant.mrpPaise)
    .filter((price): price is number => typeof price === "number");
  const lowPricePaise = pricedVariants.length ? Math.min(...pricedVariants) : null;

  return {
    id: seed.id,
    slug: seed.slug,
    title: seed.title,
    gender: seed.gender,
    brand: { ...brands[seed.brand] },
    notes: {
      top: [...seed.notes.top],
      heart: [...seed.notes.heart],
      base: [...seed.notes.base],
    },
    description: seed.description,
    isActive: activeVariants.length > 0,
    createdAt: seed.createdAt,
    updatedAt: seed.updatedAt,
    media,
    variants,
    aggregates: {
      ratingAvg: seed.ratingAvg,
      ratingCount: seed.ratingCount,
      reviewCount: seed.reviewCount ?? seed.ratingCount,
      lowPricePaise,
      inStockVariants: activeVariants.filter(
        (variant) => (variant.inventory?.stock ?? 0) > 0
      ).length,
    },
  };
});

function cloneProduct(product: Product): Product {
  return {
    ...product,
    brand: { ...product.brand },
    notes: {
      top: [...product.notes.top],
      heart: [...product.notes.heart],
      base: [...product.notes.base],
    },
    media: product.media.map((item) => ({ ...item })),
    variants: product.variants.map((variant) => ({
      ...variant,
      inventory: variant.inventory ? { ...variant.inventory } : null,
    })),
    aggregates: { ...product.aggregates },
  };
}

export function getProducts(): Product[] {
  return products.map(cloneProduct);
}

export function getProductBySlug(slug: string): Product | undefined {
  const product = products.find((item) => item.slug === slug);
  return product ? cloneProduct(product) : undefined;
}

export function getDefaultVariant(slug: string) {
  const product = products.find((item) => item.slug === slug);
  if (!product) {
    return undefined;
  }
  const [variant] = product.variants;
  return variant ? { ...variant, inventory: variant.inventory ? { ...variant.inventory } : null } : undefined;
}

export function getFeaturedProducts(limit = 4): Product[] {
  return products.slice(0, limit).map(cloneProduct);
}
