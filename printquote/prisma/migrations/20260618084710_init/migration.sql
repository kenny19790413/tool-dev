-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'staff');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('thick', 'thin');

-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('draft', 'issued', 'approved', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "CoaterType" AS ENUM ('none', 'single', 'double');

-- CreateEnum
CREATE TYPE "ColorType" AS ENUM ('process', 'special');

-- CreateEnum
CREATE TYPE "ProcessType" AS ENUM ('cutting', 'press', 'pp', 'emboss', 'foil', 'lamination', 'corrugated', 'thomson', 'binding', 'packing', 'delivery', 'other');

-- CreateEnum
CREATE TYPE "MoldType" AS ENUM ('thomson', 'foil', 'emboss', 'other');

-- CreateTable
CREATE TABLE "papers" (
    "id" SERIAL NOT NULL,
    "number" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "parent_size" VARCHAR(30) NOT NULL,
    "width_mm" DECIMAL(7,1) NOT NULL,
    "height_mm" DECIMAL(7,1) NOT NULL,
    "ream_weight" DECIMAL(6,2),
    "unit_price" DECIMAL(10,2) NOT NULL,
    "low_vol_price" DECIMAL(10,2),
    "rate" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "supplier" VARCHAR(100),
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_price_masters" (
    "id" SERIAL NOT NULL,
    "color_type" "ColorType" NOT NULL,
    "min_sheets" INTEGER NOT NULL,
    "max_sheets" INTEGER,
    "unit_price" DECIMAL(10,4) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_price_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_price_masters" (
    "id" SERIAL NOT NULL,
    "process_type" "ProcessType" NOT NULL,
    "product_type" "ProductType",
    "threshold" INTEGER NOT NULL,
    "fixed_price" DECIMAL(10,2) NOT NULL,
    "coeff_a" DECIMAL(10,6),
    "coeff_b" DECIMAL(10,4),
    "per_sheet_price" DECIMAL(10,4),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_price_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "die_molds" (
    "id" SERIAL NOT NULL,
    "mold_code" VARCHAR(30) NOT NULL,
    "mold_type" "MoldType" NOT NULL,
    "width_mm" DECIMAL(7,1) NOT NULL,
    "height_mm" DECIMAL(7,1) NOT NULL,
    "faces" INTEGER NOT NULL DEFAULT 1,
    "complexity" INTEGER NOT NULL DEFAULT 1,
    "base_mold_cost" DECIMAL(10,2),
    "customer_id" INTEGER,
    "storage_location" VARCHAR(100),
    "manufactured_at" TIMESTAMP(3),
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "die_molds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outsource_vendors" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "processTypes" "ProcessType"[],
    "contact_name" VARCHAR(50),
    "phone" VARCHAR(20),
    "email" VARCHAR(100),
    "address" TEXT,
    "rate" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outsource_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "name_kana" VARCHAR(100),
    "contact_name" VARCHAR(50),
    "email" VARCHAR(100),
    "phone" VARCHAR(20),
    "address" TEXT,
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" VARCHAR(50) NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'staff',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimates" (
    "id" SERIAL NOT NULL,
    "estimate_number" VARCHAR(20) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "customer_id" INTEGER,
    "customer_name" VARCHAR(100) NOT NULL,
    "product_type" "ProductType" NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "status" "EstimateStatus" NOT NULL DEFAULT 'draft',
    "valid_until" TIMESTAMP(3),
    "overhead_rate" DECIMAL(5,2) NOT NULL DEFAULT 15,
    "assigned_to" INTEGER,
    "note" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_items" (
    "id" SERIAL NOT NULL,
    "estimate_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 1,
    "item_name" VARCHAR(200) NOT NULL,
    "finish_width_mm" DECIMAL(7,1) NOT NULL,
    "finish_height_mm" DECIMAL(7,1) NOT NULL,
    "paper_id" INTEGER,
    "paper_name" VARCHAR(100),
    "paper_width_mm" DECIMAL(7,1),
    "paper_height_mm" DECIMAL(7,1),
    "paper_unit_price" DECIMAL(10,2),
    "faces" INTEGER NOT NULL DEFAULT 1,
    "cuts" INTEGER NOT NULL DEFAULT 1,
    "front_colors" INTEGER NOT NULL DEFAULT 4,
    "back_colors" INTEGER NOT NULL DEFAULT 0,
    "coater" "CoaterType" NOT NULL DEFAULT 'none',
    "color_type" "ColorType" NOT NULL DEFAULT 'process',
    "waste_rate" DECIMAL(5,2) NOT NULL DEFAULT 15,
    "has_mold" BOOLEAN NOT NULL DEFAULT false,
    "mold_id" INTEGER,
    "mold_complexity" INTEGER DEFAULT 1,
    "outsource_vendor_id" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_processings" (
    "id" SERIAL NOT NULL,
    "estimate_item_id" INTEGER NOT NULL,
    "process_type" "ProcessType" NOT NULL,
    "is_outsourced" BOOLEAN NOT NULL DEFAULT false,
    "outsource_vendor_id" INTEGER,
    "outsource_unit_price" DECIMAL(10,2),
    "note" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "estimate_processings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_quantities" (
    "id" SERIAL NOT NULL,
    "estimate_item_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "actual_sheets" DECIMAL(10,2),
    "waste_sheets" DECIMAL(10,2),
    "total_sheets" DECIMAL(10,2),
    "passes" DECIMAL(10,2),
    "paper_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "plate_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "print_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ink_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cutting_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "press_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pp_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "emboss_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "foil_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lamination_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "corrugated_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "thomson_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "binding_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "packing_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "delivery_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outsource_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "overhead_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(12,4),
    "is_selected" BOOLEAN NOT NULL DEFAULT false,
    "calculated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estimate_quantities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_histories" (
    "id" SERIAL NOT NULL,
    "estimate_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "changed_by" INTEGER,
    "change_note" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estimate_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imposition_suggestions" (
    "id" SERIAL NOT NULL,
    "estimate_item_id" INTEGER NOT NULL,
    "paper_id" INTEGER,
    "paper_name" VARCHAR(100),
    "faces_h" INTEGER NOT NULL,
    "faces_v" INTEGER NOT NULL,
    "total_faces" INTEGER NOT NULL,
    "rotated" BOOLEAN NOT NULL DEFAULT false,
    "total_sheets" DECIMAL(10,2),
    "paper_cost" DECIMAL(12,2),
    "pattern_label" VARCHAR(20) NOT NULL,
    "is_selected" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imposition_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "papers_number_key" ON "papers"("number");

-- CreateIndex
CREATE UNIQUE INDEX "die_molds_mold_code_key" ON "die_molds"("mold_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "estimates_estimate_number_key" ON "estimates"("estimate_number");

-- CreateIndex
CREATE INDEX "estimates_customer_id_idx" ON "estimates"("customer_id");

-- CreateIndex
CREATE INDEX "estimates_status_idx" ON "estimates"("status");

-- CreateIndex
CREATE INDEX "estimates_created_at_idx" ON "estimates"("created_at" DESC);

-- CreateIndex
CREATE INDEX "estimate_items_estimate_id_idx" ON "estimate_items"("estimate_id");

-- CreateIndex
CREATE INDEX "estimate_processings_estimate_item_id_idx" ON "estimate_processings"("estimate_item_id");

-- CreateIndex
CREATE INDEX "estimate_quantities_estimate_item_id_idx" ON "estimate_quantities"("estimate_item_id");

-- CreateIndex
CREATE INDEX "estimate_histories_estimate_id_idx" ON "estimate_histories"("estimate_id");

-- AddForeignKey
ALTER TABLE "die_molds" ADD CONSTRAINT "die_molds_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_mold_id_fkey" FOREIGN KEY ("mold_id") REFERENCES "die_molds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_outsource_vendor_id_fkey" FOREIGN KEY ("outsource_vendor_id") REFERENCES "outsource_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_processings" ADD CONSTRAINT "estimate_processings_estimate_item_id_fkey" FOREIGN KEY ("estimate_item_id") REFERENCES "estimate_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_processings" ADD CONSTRAINT "estimate_processings_outsource_vendor_id_fkey" FOREIGN KEY ("outsource_vendor_id") REFERENCES "outsource_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_quantities" ADD CONSTRAINT "estimate_quantities_estimate_item_id_fkey" FOREIGN KEY ("estimate_item_id") REFERENCES "estimate_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_histories" ADD CONSTRAINT "estimate_histories_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_histories" ADD CONSTRAINT "estimate_histories_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imposition_suggestions" ADD CONSTRAINT "imposition_suggestions_estimate_item_id_fkey" FOREIGN KEY ("estimate_item_id") REFERENCES "estimate_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imposition_suggestions" ADD CONSTRAINT "imposition_suggestions_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
