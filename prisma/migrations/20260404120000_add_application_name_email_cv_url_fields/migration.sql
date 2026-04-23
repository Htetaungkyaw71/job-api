-- Add optional candidate contact + cv URL fields to applications
ALTER TABLE "Application"
ADD COLUMN "name" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "cv_url" TEXT;
