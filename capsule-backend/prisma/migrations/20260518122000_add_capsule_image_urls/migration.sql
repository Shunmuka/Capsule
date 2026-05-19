-- Preserve existing single-image capsules while moving to native PostgreSQL text arrays.
ALTER TABLE "Capsule" ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Capsule'
      AND column_name = 'imageUrl'
  ) THEN
    UPDATE "Capsule"
    SET "imageUrls" = ARRAY["imageUrl"]
    WHERE "imageUrl" IS NOT NULL;

    ALTER TABLE "Capsule" DROP COLUMN "imageUrl";
  END IF;
END $$;
