-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('STOCK', 'BOND', 'FUND', 'PRIVATE');

-- CreateEnum
CREATE TYPE "Market" AS ENUM ('JP', 'US');

-- CreateTable
CREATE TABLE "Asset" (
    "id" SERIAL NOT NULL,
    "type" "AssetType" NOT NULL,
    "market" "Market",
    "name" TEXT NOT NULL,
    "ticker" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "quantity" DECIMAL(18,4),
    "avgCost" DECIMAL(18,4),
    "note" TEXT,
    "currentPrice" DECIMAL(18,4),
    "dividendPerShare" DECIMAL(18,4),
    "priceUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Valuation" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "value" DECIMAL(18,0) NOT NULL,
    "valuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "Valuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" SERIAL NOT NULL,
    "pair" TEXT NOT NULL,
    "rate" DECIMAL(18,6) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Asset_type_idx" ON "Asset"("type");

-- CreateIndex
CREATE INDEX "Valuation_assetId_valuedAt_idx" ON "Valuation"("assetId", "valuedAt");

-- CreateIndex
CREATE INDEX "ExchangeRate_pair_fetchedAt_idx" ON "ExchangeRate"("pair", "fetchedAt");

-- AddForeignKey
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
