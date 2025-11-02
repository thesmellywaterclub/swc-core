-- CreateEnum
CREATE TYPE "OfferCondition" AS ENUM ('NEW', 'OPEN_BOX', 'TESTER');

-- CreateEnum
CREATE TYPE "OfferAuth" AS ENUM ('SEALED', 'STORE_BILL', 'VERIFIED_UNKNOWN');

-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('UNVERIFIED', 'ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "sellerId" TEXT,
ADD COLUMN     "sellerLocationId" TEXT,
ADD COLUMN     "sellerOfferId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sellerId" TEXT;

-- CreateTable
CREATE TABLE "Seller" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rating" DECIMAL(3,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerLocation" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "delhiveryPickupCode" TEXT NOT NULL,
    "delhiveryVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "LocationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "lastVerifiedAt" TIMESTAMP(3),
    "failureCount24h" INTEGER NOT NULL DEFAULT 0,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterOffer" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "sellerLocationId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "partnerSku" TEXT,
    "price" INTEGER NOT NULL,
    "shipping" INTEGER NOT NULL DEFAULT 0,
    "mrp" INTEGER,
    "stockQty" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "condition" "OfferCondition" NOT NULL DEFAULT 'NEW',
    "authGrade" "OfferAuth" NOT NULL DEFAULT 'SEALED',
    "effectivePrice" INTEGER NOT NULL DEFAULT 0,
    "authRank" INTEGER NOT NULL DEFAULT 3,
    "condRank" INTEGER NOT NULL DEFAULT 3,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveOffer" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "sellerId" TEXT NOT NULL,
    "sellerLocationId" TEXT NOT NULL,
    "stockQtySnapshot" INTEGER NOT NULL,
    "condition" "OfferCondition" NOT NULL,
    "authGrade" "OfferAuth" NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Seller_gstNumber_key" ON "Seller"("gstNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Seller_panNumber_key" ON "Seller"("panNumber");

-- CreateIndex
CREATE INDEX "Seller_isActive_idx" ON "Seller"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SellerLocation_delhiveryPickupCode_key" ON "SellerLocation"("delhiveryPickupCode");

-- CreateIndex
CREATE INDEX "SellerLocation_sellerId_pincode_idx" ON "SellerLocation"("sellerId", "pincode");

-- CreateIndex
CREATE UNIQUE INDEX "SellerLocation_sellerId_label_key" ON "SellerLocation"("sellerId", "label");

-- CreateIndex
CREATE INDEX "MasterOffer_variantId_isActive_stockQty_effectivePrice_idx" ON "MasterOffer"("variantId", "isActive", "stockQty", "effectivePrice");

-- CreateIndex
CREATE INDEX "MasterOffer_sellerId_idx" ON "MasterOffer"("sellerId");

-- CreateIndex
CREATE INDEX "MasterOffer_sellerLocationId_idx" ON "MasterOffer"("sellerLocationId");

-- CreateIndex
CREATE INDEX "MasterOffer_isActive_expiresAt_idx" ON "MasterOffer"("isActive", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MasterOffer_sellerId_sellerLocationId_variantId_key" ON "MasterOffer"("sellerId", "sellerLocationId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveOffer_variantId_key" ON "LiveOffer"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveOffer_offerId_key" ON "LiveOffer"("offerId");

-- CreateIndex
CREATE INDEX "LiveOffer_variantId_idx" ON "LiveOffer"("variantId");

-- CreateIndex
CREATE INDEX "LiveOffer_sellerId_idx" ON "LiveOffer"("sellerId");

-- CreateIndex
CREATE INDEX "LiveOffer_sellerLocationId_idx" ON "LiveOffer"("sellerLocationId");

-- CreateIndex
CREATE INDEX "OrderItem_sellerId_idx" ON "OrderItem"("sellerId");

-- CreateIndex
CREATE INDEX "OrderItem_sellerLocationId_idx" ON "OrderItem"("sellerLocationId");

-- CreateIndex
CREATE INDEX "User_sellerId_idx" ON "User"("sellerId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_sellerLocationId_fkey" FOREIGN KEY ("sellerLocationId") REFERENCES "SellerLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_sellerOfferId_fkey" FOREIGN KEY ("sellerOfferId") REFERENCES "MasterOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerLocation" ADD CONSTRAINT "SellerLocation_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterOffer" ADD CONSTRAINT "MasterOffer_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterOffer" ADD CONSTRAINT "MasterOffer_sellerLocationId_fkey" FOREIGN KEY ("sellerLocationId") REFERENCES "SellerLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterOffer" ADD CONSTRAINT "MasterOffer_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveOffer" ADD CONSTRAINT "LiveOffer_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "MasterOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveOffer" ADD CONSTRAINT "LiveOffer_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveOffer" ADD CONSTRAINT "LiveOffer_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveOffer" ADD CONSTRAINT "LiveOffer_sellerLocationId_fkey" FOREIGN KEY ("sellerLocationId") REFERENCES "SellerLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
