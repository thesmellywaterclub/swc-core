import { homeStaticContent } from "./home.data";
import type {
  HomePageData,
  HomeProductGalleryItem,
  HomeStaticContent,
} from "./home.types";
import { getFeaturedProducts } from "../products/products.service";

function cloneStaticContent(): HomeStaticContent {
  return {
    hero: {
      ...homeStaticContent.hero,
      ctas: homeStaticContent.hero.ctas.map((cta) => ({ ...cta })),
    },
    highlights: homeStaticContent.highlights.map((highlight) => ({ ...highlight })),
    rituals: homeStaticContent.rituals.map((ritual) => ({
      ...ritual,
      steps: ritual.steps.map((step) => ({ ...step })),
    })),
    journal: homeStaticContent.journal.map((entry) => ({ ...entry })),
    membership: {
      ...homeStaticContent.membership,
      perks: homeStaticContent.membership.perks.map((perk) => ({ ...perk })),
    },
  };
}

function buildProductGallery(products: HomePageData["featuredProducts"]): HomeProductGalleryItem[] {
  return products.map((product) => {
    const primaryMedia =
      product.media.find((mediaItem) => mediaItem.isPrimary) ?? product.media[0];
    const image = primaryMedia
      ? { url: primaryMedia.url, alt: primaryMedia.alt }
      : { url: homeStaticContent.hero.image, alt: null };

    return {
      id: product.id,
      title: product.title,
      brandName: product.brand.name,
      gender: product.gender,
      href: `/products/${product.slug}`,
      image,
      lowestPricePaise: product.aggregates.lowPricePaise,
      ratingAvg: product.aggregates.ratingAvg,
      ratingCount: product.aggregates.ratingCount,
    };
  });
}

export async function getHomePageData(limit = 4): Promise<HomePageData> {
  const staticContent = cloneStaticContent();
  const featuredProducts = await getFeaturedProducts(limit);
  const productGallery = buildProductGallery(featuredProducts);

  return {
    ...staticContent,
    featuredProducts,
    productGallery,
  };
}
