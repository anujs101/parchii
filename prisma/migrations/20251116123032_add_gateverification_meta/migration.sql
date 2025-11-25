-- AlterTable
ALTER TABLE "GateVerification" ADD COLUMN     "meta" JSONB,
ADD COLUMN     "signerPubkey" TEXT;
