-- CreateEnum
CREATE TYPE "FinanceType" AS ENUM ('REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'KBZPAY', 'WAVEPAY', 'BANK', 'CARD');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PAID');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('MMK', 'KRW', 'USD');

-- CreateTable
CREATE TABLE "finance_categories" (
    "id" TEXT NOT NULL,
    "type" "FinanceType" NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_transactions" (
    "id" TEXT NOT NULL,
    "type" "FinanceType" NOT NULL,
    "category_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'MMK',
    "payment_method" "PaymentMethod" NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "note" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "created_by_user_id" INTEGER NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_attachments" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sku" TEXT,
    "sale_price" DECIMAL(10,2) NOT NULL,
    "cost_price" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_sales" (
    "id" TEXT NOT NULL,
    "sold_at" TIMESTAMPTZ(6) NOT NULL,
    "customer_name" TEXT,
    "payment_method" "PaymentMethod" NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'MMK',
    "total_amount" DECIMAL(12,2) NOT NULL,
    "created_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_sale_items" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "book_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll" (
    "id" TEXT NOT NULL,
    "teacher_user_id" INTEGER NOT NULL,
    "period_month" DATE NOT NULL,
    "base_salary" DECIMAL(12,2) NOT NULL,
    "bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_pay" DECIMAL(12,2) NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "paid_at" TIMESTAMPTZ(6),
    "payment_method" "PaymentMethod",
    "currency" "Currency" NOT NULL DEFAULT 'MMK',
    "created_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finance_categories_type_idx" ON "finance_categories"("type");
CREATE INDEX "finance_categories_parent_id_idx" ON "finance_categories"("parent_id");
CREATE INDEX "finance_categories_is_active_idx" ON "finance_categories"("is_active");

-- CreateIndex
CREATE INDEX "finance_transactions_type_occurred_at_idx" ON "finance_transactions"("type", "occurred_at");
CREATE INDEX "finance_transactions_category_id_idx" ON "finance_transactions"("category_id");
CREATE INDEX "finance_transactions_created_by_user_id_idx" ON "finance_transactions"("created_by_user_id");
CREATE INDEX "finance_transactions_is_deleted_idx" ON "finance_transactions"("is_deleted");

-- CreateIndex
CREATE INDEX "finance_attachments_transaction_id_idx" ON "finance_attachments"("transaction_id");

-- CreateIndex
CREATE INDEX "books_is_active_idx" ON "books"("is_active");

-- CreateIndex
CREATE INDEX "book_sales_sold_at_idx" ON "book_sales"("sold_at");

-- CreateIndex
CREATE INDEX "book_sale_items_sale_id_idx" ON "book_sale_items"("sale_id");
CREATE INDEX "book_sale_items_book_id_idx" ON "book_sale_items"("book_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_teacher_user_id_period_month_key" ON "payroll"("teacher_user_id", "period_month");
CREATE INDEX "payroll_period_month_idx" ON "payroll"("period_month");
CREATE INDEX "payroll_status_idx" ON "payroll"("status");

-- AddForeignKey
ALTER TABLE "finance_categories" ADD CONSTRAINT "finance_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "finance_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "finance_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_attachments" ADD CONSTRAINT "finance_attachments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "finance_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_sales" ADD CONSTRAINT "book_sales_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_sale_items" ADD CONSTRAINT "book_sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "book_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_sale_items" ADD CONSTRAINT "book_sale_items_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_teacher_user_id_fkey" FOREIGN KEY ("teacher_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
