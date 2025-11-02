import { PrismaClient, OfferAuth, OfferCondition } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertInventory(variantId: string, stock: number) {
  await prisma.inventory.upsert({
    where: { variantId },
    update: { stock, reserved: 0 },
    create: {
      variantId,
      stock,
      reserved: 0,
    },
  });
}

async function upsertMasterOffer({
  sellerId,
  sellerLocationId,
  variantId,
  price,
  shipping = 0,
  mrp,
  stockQty,
  condition = OfferCondition.NEW,
  authGrade = OfferAuth.SEALED,
}: {
  sellerId: string;
  sellerLocationId: string;
  variantId: string;
  price: number;
  shipping?: number;
  mrp?: number | null;
  stockQty: number;
  condition?: OfferCondition;
  authGrade?: OfferAuth;
}) {
  const effectivePrice = price + shipping;
  const offer = await prisma.masterOffer.upsert({
    where: {
      sellerId_sellerLocationId_variantId: {
        sellerId,
        sellerLocationId,
        variantId,
      },
    },
    update: {
      price,
      shipping,
      mrp,
      stockQty,
      isActive: stockQty > 0,
      effectivePrice,
      condition,
      authGrade,
      authRank: authGrade === OfferAuth.SEALED ? 3 : authGrade === OfferAuth.STORE_BILL ? 2 : 1,
      condRank: condition === OfferCondition.NEW ? 3 : condition === OfferCondition.OPEN_BOX ? 2 : 1,
    },
    create: {
      sellerId,
      sellerLocationId,
      variantId,
      price,
      shipping,
      mrp,
      stockQty,
      effectivePrice,
      condition,
      authGrade,
      authRank: authGrade === OfferAuth.SEALED ? 3 : authGrade === OfferAuth.STORE_BILL ? 2 : 1,
      condRank: condition === OfferCondition.NEW ? 3 : condition === OfferCondition.OPEN_BOX ? 2 : 1,
    },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          displayName: true,
        },
      },
      sellerLocation: {
        select: {
          id: true,
          label: true,
        },
      },
    },
  });

  await prisma.liveOffer.upsert({
    where: {
      variantId,
    },
    update: {
      offerId: offer.id,
      price,
      sellerId,
      sellerLocationId,
      stockQtySnapshot: stockQty,
      condition: offer.condition,
      authGrade: offer.authGrade,
      computedAt: new Date(),
    },
    create: {
      variantId,
      offerId: offer.id,
      price,
      sellerId,
      sellerLocationId,
      stockQtySnapshot: stockQty,
      condition: offer.condition,
      authGrade: offer.authGrade,
    },
  });
}

async function seed() {
  const [customerPasswordHash, sellerPasswordHash] = await Promise.all([
    bcrypt.hash("Customer@123", 12),
    bcrypt.hash("Seller@123", 12),
  ]);

  const acmeBrand = await prisma.brand.upsert({
    where: { name: "Acme Scents" },
    update: {},
    create: {
      name: "Acme Scents",
    },
  });

  const auroraBrand = await prisma.brand.upsert({
    where: { name: "Aurora Atelier" },
    update: {},
    create: {
      name: "Aurora Atelier",
    },
  });

  const midnightBrand = await prisma.brand.upsert({
    where: { name: "Midnight Collective" },
    update: {},
    create: {
      name: "Midnight Collective",
    },
  });

  const lumenBrand = await prisma.brand.upsert({
    where: { name: "Lumen Parfums" },
    update: {},
    create: {
      name: "Lumen Parfums",
    },
  });

  const citrusProduct = await prisma.product.upsert({
    where: { slug: "citrus-breeze-eau-de-parfum" },
    update: {
      description:
        "Bright citrus with a clean, musky dry down. Perfect for daily wear and gifting.",
      notes: {
        top: ["bergamot", "pink grapefruit"],
        heart: ["neroli", "lavender"],
        base: ["cedarwood", "musk"],
      },
      isActive: true,
    },
    create: {
      slug: "citrus-breeze-eau-de-parfum",
      title: "Citrus Breeze Eau de Parfum",
      brandId: acmeBrand.id,
      gender: "unisex",
      description:
        "Bright citrus with a clean, musky dry down. Perfect for daily wear and gifting.",
      notes: {
        top: ["bergamot", "pink grapefruit"],
        heart: ["neroli", "lavender"],
        base: ["cedarwood", "musk"],
      },
      media: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1612810806695-30ba71080906?auto=format&fit=crop&w=1080&q=80",
            alt: "Bottle of Citrus Breeze Eau de Parfum",
            sortOrder: 0,
            isPrimary: true,
          },
        ],
      },
    },
  });

  const auroraProduct = await prisma.product.upsert({
    where: { slug: "aurora-amber-essence" },
    update: {
      description:
        "Warm amber and tonka bean wrapped in vanilla for an indulgent evening scent.",
      notes: {
        top: ["mandarin zest", "pink pepper"],
        heart: ["amber accord", "tonka bean"],
        base: ["vanilla", "cashmere wood"],
      },
      isActive: true,
    },
    create: {
      slug: "aurora-amber-essence",
      title: "Aurora Amber Essence",
      brandId: auroraBrand.id,
      gender: "women",
      description:
        "Warm amber and tonka bean wrapped in vanilla for an indulgent evening scent.",
      notes: {
        top: ["mandarin zest", "pink pepper"],
        heart: ["amber accord", "tonka bean"],
        base: ["vanilla", "cashmere wood"],
      },
      media: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1420423156555-420ec4c632b3?auto=format&fit=crop&w=1080&q=80",
            alt: "Aurora Amber Essence bottle",
            sortOrder: 0,
            isPrimary: true,
          },
        ],
      },
    },
  });

  const midnightProduct = await prisma.product.upsert({
    where: { slug: "midnight-wood-saffron" },
    update: {
      description:
        "Smoky woods with saffron and leather create a rich evening statement.",
      notes: {
        top: ["saffron", "cardamom"],
        heart: ["leather", "orris root"],
        base: ["oud", "smoked cedar"],
      },
      isActive: true,
    },
    create: {
      slug: "midnight-wood-saffron",
      title: "Midnight Wood & Saffron",
      brandId: midnightBrand.id,
      gender: "men",
      description:
        "Smoky woods with saffron and leather create a rich evening statement.",
      notes: {
        top: ["saffron", "cardamom"],
        heart: ["leather", "orris root"],
        base: ["oud", "smoked cedar"],
      },
      media: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1503751071777-d2918b21bbd8?auto=format&fit=crop&w=1080&q=80",
            alt: "Midnight Wood & Saffron presentation",
            sortOrder: 0,
            isPrimary: true,
          },
        ],
      },
    },
  });

  const oceanicProduct = await prisma.product.upsert({
    where: { slug: "oceanic-drift-eau-de-parfum" },
    update: {
      description:
        "Marine citrus mingles with aromatic herbs for an invigorating coastal trail.",
      notes: {
        top: ["sea salt", "grapefruit"],
        heart: ["rosemary", "sage"],
        base: ["white musk", "driftwood"],
      },
      isActive: true,
    },
    create: {
      slug: "oceanic-drift-eau-de-parfum",
      title: "Oceanic Drift Eau de Parfum",
      brandId: lumenBrand.id,
      gender: "men",
      description:
        "Marine citrus mingles with aromatic herbs for an invigorating coastal trail.",
      notes: {
        top: ["sea salt", "grapefruit"],
        heart: ["rosemary", "sage"],
        base: ["white musk", "driftwood"],
      },
      media: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1080&q=80",
            alt: "Oceanic Drift bottle with water splashes",
            sortOrder: 0,
            isPrimary: true,
          },
        ],
      },
    },
  });

  const velvetProduct = await prisma.product.upsert({
    where: { slug: "velvet-rose-extrait" },
    update: {
      description:
        "Lush rose petals with saffron and praline for a decadent evening signature.",
      notes: {
        top: ["saffron", "pink pepper"],
        heart: ["damask rose", "peony"],
        base: ["praline", "patchouli"],
      },
      isActive: true,
    },
    create: {
      slug: "velvet-rose-extrait",
      title: "Velvet Rose Extrait",
      brandId: lumenBrand.id,
      gender: "women",
      description:
        "Lush rose petals with saffron and praline for a decadent evening signature.",
      notes: {
        top: ["saffron", "pink pepper"],
        heart: ["damask rose", "peony"],
        base: ["praline", "patchouli"],
      },
      media: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1515468381879-40d0ded8106f?auto=format&fit=crop&w=1080&q=80",
            alt: "Velvet Rose Extrait presentation with petals",
            sortOrder: 0,
            isPrimary: true,
          },
        ],
      },
    },
  });

  const cedarProduct = await prisma.product.upsert({
    where: { slug: "cedar-mist-cologne" },
    update: {
      description:
        "Airy cedarwood wrapped with bergamot and ambergris for a balanced unisex cologne.",
      notes: {
        top: ["bergamot", "lemon zest"],
        heart: ["cedarwood", "lavandin"],
        base: ["ambergris accord", "musk"],
      },
      isActive: true,
    },
    create: {
      slug: "cedar-mist-cologne",
      title: "Cedar Mist Cologne",
      brandId: lumenBrand.id,
      gender: "unisex",
      description:
        "Airy cedarwood wrapped with bergamot and ambergris for a balanced unisex cologne.",
      notes: {
        top: ["bergamot", "lemon zest"],
        heart: ["cedarwood", "lavandin"],
        base: ["ambergris accord", "musk"],
      },
      media: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1504904126298-3fde501c9c1c?auto=format&fit=crop&w=1080&q=80",
            alt: "Cedar Mist Cologne on wooden table",
            sortOrder: 0,
            isPrimary: true,
          },
        ],
      },
    },
  });

  const citrusVariant50 = await prisma.productVariant.upsert({
    where: { sku: "ACME-CB-50" },
    update: {
      salePaise: 289_900,
      isActive: true,
    },
    create: {
      productId: citrusProduct.id,
      sizeMl: 50,
      sku: "ACME-CB-50",
      mrpPaise: 349_900,
      salePaise: 289_900,
      isActive: true,
    },
  });

  const auroraVariant75 = await prisma.productVariant.upsert({
    where: { sku: "AUR-AMB-75" },
    update: {
      salePaise: 459_900,
      isActive: true,
    },
    create: {
      productId: auroraProduct.id,
      sizeMl: 75,
      sku: "AUR-AMB-75",
      mrpPaise: 499_900,
      salePaise: 459_900,
      isActive: true,
    },
  });

  const midnightVariant100 = await prisma.productVariant.upsert({
    where: { sku: "MID-WOOD-100" },
    update: {
      salePaise: 519_900,
      isActive: true,
    },
    create: {
      productId: midnightProduct.id,
      sizeMl: 100,
      sku: "MID-WOOD-100",
      mrpPaise: 559_900,
      salePaise: 519_900,
      isActive: true,
    },
  });

  const oceanicVariant100 = await prisma.productVariant.upsert({
    where: { sku: "LUM-OCD-100" },
    update: {
      salePaise: 379_900,
      isActive: true,
    },
    create: {
      productId: oceanicProduct.id,
      sizeMl: 100,
      sku: "LUM-OCD-100",
      mrpPaise: 419_900,
      salePaise: 379_900,
      isActive: true,
    },
  });

  const velvetVariant50 = await prisma.productVariant.upsert({
    where: { sku: "LUM-VRX-50" },
    update: {
      salePaise: 489_900,
      isActive: true,
    },
    create: {
      productId: velvetProduct.id,
      sizeMl: 50,
      sku: "LUM-VRX-50",
      mrpPaise: 529_900,
      salePaise: 489_900,
      isActive: true,
    },
  });

  const cedarVariant80 = await prisma.productVariant.upsert({
    where: { sku: "LUM-CDM-80" },
    update: {
      salePaise: 309_900,
      isActive: true,
    },
    create: {
      productId: cedarProduct.id,
      sizeMl: 80,
      sku: "LUM-CDM-80",
      mrpPaise: 339_900,
      salePaise: 309_900,
      isActive: true,
    },
  });

  await Promise.all([
    upsertInventory(citrusVariant50.id, 150),
    upsertInventory(auroraVariant75.id, 60),
    upsertInventory(midnightVariant100.id, 40),
    upsertInventory(oceanicVariant100.id, 70),
    upsertInventory(velvetVariant50.id, 55),
    upsertInventory(cedarVariant80.id, 95),
  ]);

  const customer = await prisma.user.upsert({
    where: { email: "demo@swc.dev" },
    update: {
      fullName: "Demo Customer",
      phone: "9998887777",
      passwordHash: customerPasswordHash,
      isSeller: false,
      seller: {
        disconnect: true,
      },
    },
    create: {
      email: "demo@swc.dev",
      passwordHash: customerPasswordHash,
      fullName: "Demo Customer",
      phone: "9998887777",
      clubMember: true,
      addresses: {
        create: [
          {
            label: "Home",
            isDefault: true,
            firstName: "Demo",
            lastName: "Customer",
            line1: "221B Seed Street",
            city: "Mumbai",
            state: "MH",
            postalCode: "400001",
            phone: "9998887777",
          },
        ],
      },
    },
  });

  const cart = await prisma.cart.upsert({
    where: { userId: customer.id },
    update: {},
    create: {
      userId: customer.id,
    },
  });

  await prisma.cartItem.upsert({
    where: {
      cartId_variantId: {
        cartId: cart.id,
        variantId: citrusVariant50.id,
      },
    },
    update: {
      quantity: 1,
    },
    create: {
      cartId: cart.id,
      variantId: citrusVariant50.id,
      quantity: 1,
    },
  });

  await prisma.priceWatch.upsert({
    where: {
      userId_variantId: {
        userId: customer.id,
        variantId: citrusVariant50.id,
      },
    },
    update: {
      thresholdPaise: 259_900,
      alertEnabled: true,
    },
    create: {
      userId: customer.id,
      variantId: citrusVariant50.id,
      thresholdPaise: 259_900,
      alertEnabled: true,
    },
  });

  await prisma.productPriceHistory.upsert({
    where: { id: "seed-price-history-citrus-breeze" },
    update: {
      pricePaise: citrusVariant50.salePaise ?? citrusVariant50.mrpPaise,
    },
    create: {
      id: "seed-price-history-citrus-breeze",
      variantId: citrusVariant50.id,
      pricePaise: citrusVariant50.salePaise ?? citrusVariant50.mrpPaise,
    },
  });

  const seller = await prisma.seller.upsert({
    where: { gstNumber: "29AURPA1234F1ZV" },
    update: {
      name: "Aurora Perfume Atelier",
      displayName: "Aurora Atelier",
      email: "ops@auroraatelier.dev",
      phone: "+91 91234 56789",
      isActive: true,
    },
    create: {
      name: "Aurora Perfume Atelier",
      displayName: "Aurora Atelier",
      email: "ops@auroraatelier.dev",
      phone: "+91 91234 56789",
      gstNumber: "29AURPA1234F1ZV",
      panNumber: "AURPA1234F",
      isActive: true,
    },
  });

  const primaryLocation = await prisma.sellerLocation.upsert({
    where: { delhiveryPickupCode: "DL-AUR-001" },
    update: {
      label: "Bengaluru Warehouse",
      address1: "Plot 7, Industrial Estate",
      address2: "Phase 2",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      contactName: "Ananya Rao",
      contactPhone: "+91 98765 43210",
      status: "ACTIVE",
      delhiveryVerified: true,
      sellerId: seller.id,
    },
    create: {
      sellerId: seller.id,
      label: "Bengaluru Warehouse",
      address1: "Plot 7, Industrial Estate",
      address2: "Phase 2",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      delhiveryPickupCode: "DL-AUR-001",
      delhiveryVerified: true,
      status: "ACTIVE",
      contactName: "Ananya Rao",
      contactPhone: "+91 98765 43210",
      lastVerifiedAt: new Date(),
    },
  });

  await prisma.sellerLocation.upsert({
    where: { delhiveryPickupCode: "DL-AUR-002" },
    update: {
      label: "Mumbai Boutique",
      address1: "18 Marine Drive",
      address2: "Suite 4",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400002",
      contactName: "Dev Khanna",
      contactPhone: "+91 99887 66554",
      status: "UNVERIFIED",
      sellerId: seller.id,
    },
    create: {
      sellerId: seller.id,
      label: "Mumbai Boutique",
      address1: "18 Marine Drive",
      address2: "Suite 4",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400002",
      delhiveryPickupCode: "DL-AUR-002",
      delhiveryVerified: false,
      status: "UNVERIFIED",
      contactName: "Dev Khanna",
      contactPhone: "+91 99887 66554",
    },
  });

  await prisma.user.upsert({
    where: { email: "seller@swc.dev" },
    update: {
      fullName: "Aurora Seller",
      phone: "+91 91234 56789",
      passwordHash: sellerPasswordHash,
      isSeller: true,
      seller: {
        connect: { id: seller.id },
      },
    },
    create: {
      email: "seller@swc.dev",
      passwordHash: sellerPasswordHash,
      fullName: "Aurora Seller",
      phone: "+91 91234 56789",
      isSeller: true,
      seller: {
        connect: { id: seller.id },
      },
    },
  });

  await upsertMasterOffer({
    sellerId: seller.id,
    sellerLocationId: primaryLocation.id,
    variantId: citrusVariant50.id,
    price: 272_900,
    mrp: citrusVariant50.mrpPaise,
    stockQty: 42,
  });

  await upsertMasterOffer({
    sellerId: seller.id,
    sellerLocationId: primaryLocation.id,
    variantId: auroraVariant75.id,
    price: 449_900,
    mrp: auroraVariant75.mrpPaise,
    stockQty: 28,
  });

  await upsertMasterOffer({
    sellerId: seller.id,
    sellerLocationId: primaryLocation.id,
    variantId: midnightVariant100.id,
    price: 509_900,
    mrp: midnightVariant100.mrpPaise,
    stockQty: 16,
    condition: OfferCondition.NEW,
    authGrade: OfferAuth.STORE_BILL,
  });

  await upsertMasterOffer({
    sellerId: seller.id,
    sellerLocationId: primaryLocation.id,
    variantId: oceanicVariant100.id,
    price: 359_900,
    mrp: oceanicVariant100.mrpPaise,
    stockQty: 30,
  });

  await upsertMasterOffer({
    sellerId: seller.id,
    sellerLocationId: primaryLocation.id,
    variantId: velvetVariant50.id,
    price: 469_900,
    mrp: velvetVariant50.mrpPaise,
    stockQty: 24,
    condition: OfferCondition.NEW,
    authGrade: OfferAuth.SEALED,
  });

  await upsertMasterOffer({
    sellerId: seller.id,
    sellerLocationId: primaryLocation.id,
    variantId: cedarVariant80.id,
    price: 289_900,
    mrp: cedarVariant80.mrpPaise,
    stockQty: 65,
    condition: OfferCondition.NEW,
    authGrade: OfferAuth.VERIFIED_UNKNOWN,
  });
}

async function main() {
  try {
    await seed();
  } catch (error) {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
