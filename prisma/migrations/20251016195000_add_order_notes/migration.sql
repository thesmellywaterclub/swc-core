-- AlterTable
ALTER TABLE "Order"
    ADD COLUMN "notes" TEXT,
    ADD COLUMN "guestEmail" TEXT,
    ALTER COLUMN "userId" DROP NOT NULL;
