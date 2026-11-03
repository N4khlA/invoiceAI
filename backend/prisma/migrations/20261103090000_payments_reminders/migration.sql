-- AlterTable
ALTER TABLE "follow_ups" ADD COLUMN     "reminderKey" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "paidVia" TEXT,
ADD COLUMN     "stripeCheckoutSessionId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "autoReminders" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "follow_ups_invoiceId_reminderKey_key" ON "follow_ups"("invoiceId", "reminderKey");

