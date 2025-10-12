import type { Product } from "../products/products.dto";

export type HomeHero = {
  eyebrow: string;
  heading: string;
  subheading: string;
  ctas: Array<{
    label: string;
    href: string;
    emphasis?: boolean;
  }>;
  image: string;
};

export type HomeHighlight = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

export type HomeRitual = {
  id: string;
  title: string;
  focus: string;
  steps: Array<{
    title: string;
    description: string;
  }>;
  illustration: string;
};

export type HomeJournalEntry = {
  id: string;
  title: string;
  excerpt: string;
  href: string;
  image: string;
};

export type HomeMembershipPerk = {
  id: string;
  title: string;
  description: string;
};

export type HomeProductGalleryItem = {
  id: string;
  title: string;
  brandName: string;
  gender: Product["gender"];
  href: string;
  image: {
    url: string;
    alt: string | null;
  };
  lowestPricePaise: number | null;
  ratingAvg: number;
  ratingCount: number;
};

export type HomePageData = {
  hero: HomeHero;
  featuredProducts: Product[];
  productGallery: HomeProductGalleryItem[];
  highlights: HomeHighlight[];
  rituals: HomeRitual[];
  journal: HomeJournalEntry[];
  membership: {
    headline: string;
    subheadline: string;
    perks: HomeMembershipPerk[];
  };
};

export type HomeStaticContent = Omit<HomePageData, "featuredProducts" | "productGallery">;
