-- CreateEnum
CREATE TYPE "public"."EventState" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."EventCategory" AS ENUM ('CONFERENCE', 'WORKSHOP', 'MEETUP', 'CONCERT', 'SPORTS', 'ART', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."TicketStatus" AS ENUM ('ACTIVE', 'USED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."Event" (
    "eventId" TEXT NOT NULL,
    "organizerPubkey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "posterUrl" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "priceLamports" BIGINT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "collectionPubkey" VARCHAR(44),
    "collectionCreatedAt" TIMESTAMP(3),
    "collectionTxSignature" VARCHAR(88),
    "venue" TEXT,
    "category" "public"."EventCategory" NOT NULL DEFAULT 'OTHER',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "state" "public"."EventState" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "public"."Ticket" (
    "ticketId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "holderPubkey" TEXT NOT NULL,
    "mintPubkey" TEXT,
    "purchasePrice" BIGINT NOT NULL,
    "seatNumber" TEXT,
    "tier" TEXT,
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'ACTIVE',
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "metadataUri" TEXT,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("ticketId")
);

-- CreateTable
CREATE TABLE "public"."GateVerification" (
    "verificationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "verifierPubkey" TEXT NOT NULL,
    "status" "public"."VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GateVerification_pkey" PRIMARY KEY ("verificationId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_collectionPubkey_key" ON "public"."Event"("collectionPubkey");

-- CreateIndex
CREATE INDEX "Event_organizerPubkey_idx" ON "public"."Event"("organizerPubkey");

-- CreateIndex
CREATE INDEX "Event_state_idx" ON "public"."Event"("state");

-- CreateIndex
CREATE INDEX "Event_category_idx" ON "public"."Event"("category");

-- CreateIndex
CREATE INDEX "Event_startTime_idx" ON "public"."Event"("startTime");

-- CreateIndex
CREATE INDEX "Event_collectionPubkey_idx" ON "public"."Event"("collectionPubkey");

-- CreateIndex
CREATE INDEX "Ticket_eventId_idx" ON "public"."Ticket"("eventId");

-- CreateIndex
CREATE INDEX "Ticket_holderPubkey_idx" ON "public"."Ticket"("holderPubkey");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "public"."Ticket"("status");

-- CreateIndex
CREATE INDEX "GateVerification_eventId_idx" ON "public"."GateVerification"("eventId");

-- CreateIndex
CREATE INDEX "GateVerification_ticketId_idx" ON "public"."GateVerification"("ticketId");

-- CreateIndex
CREATE INDEX "GateVerification_verifierPubkey_idx" ON "public"."GateVerification"("verifierPubkey");

-- CreateIndex
CREATE INDEX "GateVerification_status_idx" ON "public"."GateVerification"("status");

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("eventId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GateVerification" ADD CONSTRAINT "GateVerification_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("eventId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GateVerification" ADD CONSTRAINT "GateVerification_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("ticketId") ON DELETE CASCADE ON UPDATE CASCADE;
