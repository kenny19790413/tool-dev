-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "avgCostFxRate" DECIMAL(10,4),
ADD COLUMN     "splitAlert" TEXT,
ADD COLUMN     "splitAlertAt" TIMESTAMP(3),
ADD COLUMN     "splitAlertRatio" DECIMAL(10,4);
