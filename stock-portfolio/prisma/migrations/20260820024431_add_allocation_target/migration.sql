-- CreateTable
CREATE TABLE "AllocationTarget" (
    "assetType" "AssetType" NOT NULL,
    "targetPercent" DECIMAL(5,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllocationTarget_pkey" PRIMARY KEY ("assetType")
);
