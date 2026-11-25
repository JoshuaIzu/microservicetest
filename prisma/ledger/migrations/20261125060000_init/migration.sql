-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "fintech";

-- CreateTable
CREATE TABLE "fintech"."Journal" (
    "paymentId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "currency" TEXT NOT NULL,

    CONSTRAINT "Journal_pkey" PRIMARY KEY ("paymentId")
);

-- CreateTable
CREATE TABLE "fintech"."Entry" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "account" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Journal_eventId_key" ON "fintech"."Journal"("eventId");

-- CreateIndex
CREATE INDEX "Entry_paymentId_idx" ON "fintech"."Entry"("paymentId");

-- AddForeignKey
ALTER TABLE "fintech"."Entry" ADD CONSTRAINT "Entry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "fintech"."Journal"("paymentId") ON DELETE RESTRICT ON UPDATE CASCADE;
