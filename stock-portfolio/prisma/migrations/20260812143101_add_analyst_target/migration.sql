-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "analystDataUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "numberOfAnalystOpinions" INTEGER,
ADD COLUMN     "recommendationKey" TEXT,
ADD COLUMN     "targetHighPrice" DECIMAL(18,4),
ADD COLUMN     "targetLowPrice" DECIMAL(18,4),
ADD COLUMN     "targetMeanPrice" DECIMAL(18,4);
