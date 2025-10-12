import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  const brand = await prisma.brand.upsert({
    where: { name: 'Acme Scents' },
    update: {},
    create: {
      name: 'Acme Scents',
    },
  });

  const product = await prisma.product.upsert({
    where: { slug: 'citrus-breeze' },
    update: {},
    create: {
      slug: 'citrus-breeze',
      title: 'Citrus Breeze Eau de Parfum',
      brandId: brand.id,
      gender: 'unisex',
      description:
        'Bright citrus with a clean, musky dry down. Perfect for daily wear and gifting.',
      notes: {
        top: ['bergamot', 'pink grapefruit'],
        heart: ['neroli', 'lavender'],
        base: ['cedarwood', 'musk'],
      },
      media: {
        create: [
          {
            url: 'https://example.com/assets/citrus-breeze/main.jpg',
            alt: 'Bottle of Citrus Breeze Eau de Parfum',
            sortOrder: 0,
            isPrimary: true,
          },
        ],
      },
    },
  });

  const variant = await prisma.productVariant.upsert({
    where: { sku: 'ACME-CB-50' },
    update: {
      salePaise: 289_900,
      isActive: true,
    },
    create: {
      productId: product.id,
      sizeMl: 50,
      sku: 'ACME-CB-50',
      mrpPaise: 349_900,
      salePaise: 289_900,
      isActive: true,
      inventory: {
        create: {
          stock: 150,
        },
      },
    },
  });

  await prisma.inventory.upsert({
    where: { variantId: variant.id },
    update: { stock: 150, reserved: 0 },
    create: {
      variantId: variant.id,
      stock: 150,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'demo@swc.dev' },
    update: {
      fullName: 'Demo Customer',
      phone: '9998887777',
    },
    create: {
      email: 'demo@swc.dev',
      passwordHash: 'demo-hash',
      fullName: 'Demo Customer',
      phone: '9998887777',
      clubMember: true,
      addresses: {
        create: [
          {
            label: 'Home',
            isDefault: true,
            firstName: 'Demo',
            lastName: 'Customer',
            line1: '221B Seed Street',
            city: 'Mumbai',
            state: 'MH',
            postalCode: '400001',
            phone: '9998887777',
          },
        ],
      },
    },
  });

  const cart = await prisma.cart.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
    },
  });

  await prisma.cartItem.upsert({
    where: {
      cartId_variantId: {
        cartId: cart.id,
        variantId: variant.id,
      },
    },
    update: {
      quantity: 1,
    },
    create: {
      cartId: cart.id,
      variantId: variant.id,
      quantity: 1,
    },
  });

  await prisma.priceWatch.upsert({
    where: {
      userId_variantId: {
        userId: user.id,
        variantId: variant.id,
      },
    },
    update: {
      thresholdPaise: 259_900,
      alertEnabled: true,
    },
    create: {
      userId: user.id,
      variantId: variant.id,
      thresholdPaise: 259_900,
      alertEnabled: true,
    },
  });

  await prisma.productPriceHistory.upsert({
    where: { id: 'seed-price-history-citrus-breeze' },
    update: {
      pricePaise: variant.salePaise ?? variant.mrpPaise,
    },
    create: {
      id: 'seed-price-history-citrus-breeze',
      variantId: variant.id,
      pricePaise: variant.salePaise ?? variant.mrpPaise,
    },
  });
}

async function main() {
  try {
    await seed();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
