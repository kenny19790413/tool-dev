-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "shareholderPerk" TEXT,
ADD COLUMN     "shareholderPerkMonths" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
