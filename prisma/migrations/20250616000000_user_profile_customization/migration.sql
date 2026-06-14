-- AlterTable
ALTER TABLE "users" ADD COLUMN "signature" TEXT;
ALTER TABLE "users" ADD COLUMN "signatureEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "profileUpdatedAt" TIMESTAMP(3);
