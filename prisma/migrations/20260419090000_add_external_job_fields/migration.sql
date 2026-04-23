-- Add external application support fields to Job
ALTER TABLE "Job"
ADD COLUMN "externalJob" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "applyLink" TEXT,
ADD COLUMN "logo" TEXT;
