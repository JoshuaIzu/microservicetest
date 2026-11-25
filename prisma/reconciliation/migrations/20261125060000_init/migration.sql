-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "fintech";

-- CreateTable
CREATE TABLE "fintech"."Settlement" (
    "paymentId" UUID NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "provider" TEXT NOT NULL,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("paymentId")
);

-- CreateTable
CREATE TABLE "fintech"."CapturedPayment" (
    "paymentId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,

    CONSTRAINT "CapturedPayment_pkey" PRIMARY KEY ("paymentId")
);

-- CreateTable
CREATE TABLE "fintech"."PostedJournal" (
    "paymentId" UUID NOT NULL,
    "captureEventId" UUID NOT NULL,
    "currency" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,

    CONSTRAINT "PostedJournal_pkey" PRIMARY KEY ("paymentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "CapturedPayment_eventId_key" ON "fintech"."CapturedPayment"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "PostedJournal_captureEventId_key" ON "fintech"."PostedJournal"("captureEventId");
