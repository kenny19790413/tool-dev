-- CreateTable
CREATE TABLE "DistributionReceipt" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistributionReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DistributionReceipt_assetId_receivedAt_idx" ON "DistributionReceipt"("assetId", "receivedAt");

-- AddForeignKey
ALTER TABLE "DistributionReceipt" ADD CONSTRAINT "DistributionReceipt_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
