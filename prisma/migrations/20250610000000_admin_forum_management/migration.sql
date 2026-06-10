-- AlterTable: add new columns with defaults where possible
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "forums" ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "forums" ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT false;

-- Backfill category slugs from names
UPDATE "categories"
SET "slug" = regexp_replace(
  regexp_replace(lower(trim("name")), '[^a-z0-9]+', '-', 'g'),
  '(^-|-$)',
  '',
  'g'
)
WHERE "slug" IS NULL OR "slug" = '';

-- Ensure slug is required and unique
ALTER TABLE "categories" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_key" ON "categories"("slug");
