-- Preserve existing single-image capsules while moving to native PostgreSQL text arrays.
ALTER TABLE "Capsule" ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Capsule"
SET "imageUrls" = ARRAY["imageUrl"]
WHERE "imageUrl" IS NOT NULL;

ALTER TABLE "Capsule" DROP COLUMN "imageUrl";
