import { homeStaticContent } from "./home.data";
import type {
  HomeGenderSection,
  HomePageData,
  HomeProductGalleryItem,
  HomeStaticContent,
} from "./home.types";
import {
  getFeaturedProducts,
  listProducts,
} from "../products/products.service";

const fallbackHeroImage = homeStaticContent.hero.image;

function cloneStaticContent(): HomeStaticContent {
  return {
    hero: null,
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
    genderSections: homeStaticContent.genderSections.map((section) => ({
      ...section,
    })),
  };
}

function buildProductGallery(products: HomePageData["featuredProducts"]): HomeProductGalleryItem[] {
  return products.map((product) => {
    const primaryMedia =
      product.media.find((mediaItem) => mediaItem.isPrimary) ?? product.media[0];
    const image = primaryMedia
      ? { url: primaryMedia.url, alt: primaryMedia.alt }
      : { url: fallbackHeroImage, alt: null };

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

  const genderSections: HomeGenderSection[] = await Promise.all(
    staticContent.genderSections.map(async (sectionMeta) => {
      const genderFilter = sectionMeta.id;
      const genderProductsResult = await listProducts({
        limit: sectionMeta.limit ?? 4,
        gender: genderFilter,
        isActive: true,
      });

      const mappedProducts = buildProductGallery(genderProductsResult.data);

      return {
        ...sectionMeta,
        products: mappedProducts,
      };
    })
  );

  return {
    ...staticContent,
    featuredProducts,
    productGallery,
    genderSections,
  };
}
