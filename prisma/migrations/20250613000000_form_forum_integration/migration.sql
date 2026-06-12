-- Clear standalone-era forms that cannot be linked to forums
DELETE FROM "submission_answers";
DELETE FROM "form_submissions";
DELETE FROM "form_fields";
DELETE FROM "forms";

-- AlterTable
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "buttonLabel" TEXT NOT NULL DEFAULT 'Submit';
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "forumId" TEXT;

-- AlterTable
ALTER TABLE "form_submissions" ADD COLUMN IF NOT EXISTS "threadId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "form_reviewer_roles" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "form_reviewer_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "form_reviewer_roles_formId_roleId_key" ON "form_reviewer_roles"("formId", "roleId");
CREATE INDEX IF NOT EXISTS "form_reviewer_roles_formId_idx" ON "form_reviewer_roles"("formId");
CREATE INDEX IF NOT EXISTS "form_reviewer_roles_roleId_idx" ON "form_reviewer_roles"("roleId");
CREATE UNIQUE INDEX IF NOT EXISTS "forms_forumId_key" ON "forms"("forumId");
CREATE INDEX IF NOT EXISTS "forms_categoryId_idx" ON "forms"("categoryId");
CREATE UNIQUE INDEX IF NOT EXISTS "form_submissions_threadId_key" ON "form_submissions"("threadId");

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "forms" ADD CONSTRAINT "forms_forumId_fkey" FOREIGN KEY ("forumId") REFERENCES "forums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "form_reviewer_roles" ADD CONSTRAINT "form_reviewer_roles_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "form_reviewer_roles" ADD CONSTRAINT "form_reviewer_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "app_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "forms" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "forms" ALTER COLUMN "forumId" SET NOT NULL;
