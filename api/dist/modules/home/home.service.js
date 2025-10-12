"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHomePageData = getHomePageData;
const home_data_1 = require("./home.data");
const products_service_1 = require("../products/products.service");
function cloneStaticContent() {
    return {
        hero: {
            ...home_data_1.homeStaticContent.hero,
            ctas: home_data_1.homeStaticContent.hero.ctas.map((cta) => ({ ...cta })),
        },
        highlights: home_data_1.homeStaticContent.highlights.map((highlight) => ({ ...highlight })),
        rituals: home_data_1.homeStaticContent.rituals.map((ritual) => ({
            ...ritual,
            steps: ritual.steps.map((step) => ({ ...step })),
        })),
        journal: home_data_1.homeStaticContent.journal.map((entry) => ({ ...entry })),
        membership: {
            ...home_data_1.homeStaticContent.membership,
            perks: home_data_1.homeStaticContent.membership.perks.map((perk) => ({ ...perk })),
        },
    };
}
function buildProductGallery(products) {
    return products.map((product) => {
        const primaryMedia = product.media.find((mediaItem) => mediaItem.isPrimary) ?? product.media[0];
        const image = primaryMedia
            ? { url: primaryMedia.url, alt: primaryMedia.alt }
            : { url: home_data_1.homeStaticContent.hero.image, alt: null };
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
async function getHomePageData(limit = 4) {
    const staticContent = cloneStaticContent();
    const featuredProducts = (0, products_service_1.getFeaturedProducts)(limit);
    const productGallery = buildProductGallery(featuredProducts);
    return {
        ...staticContent,
        featuredProducts,
        productGallery,
    };
}
