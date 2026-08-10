/*
  Warnings:

  - You are about to alter the column `value` on the `Valuation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,0)` to `Decimal(18,2)`.

*/
-- AlterTable
ALTER TABLE "Valuation" ALTER COLUMN "value" SET DATA TYPE DECIMAL(18,2);
