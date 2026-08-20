-- CreateEnum
CREATE TYPE "AssetOwnerType" AS ENUM ('INDIVIDUAL', 'CORPORATE');

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "ownerType" "AssetOwnerType" NOT NULL DEFAULT 'CORPORATE';
