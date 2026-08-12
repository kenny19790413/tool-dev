-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "distributionMonths" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
