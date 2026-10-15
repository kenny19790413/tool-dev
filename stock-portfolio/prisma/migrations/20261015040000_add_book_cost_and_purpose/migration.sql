-- CreateEnum
CREATE TYPE "HoldingPurpose" AS ENUM ('RELATIONSHIP', 'INCOME', 'GROWTH');

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "bookCostJpy" DECIMAL(18,2),
ADD COLUMN     "holdingPurpose" "HoldingPurpose";
