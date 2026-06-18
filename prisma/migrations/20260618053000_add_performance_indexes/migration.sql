-- Speed up search/filter paths used by the public jobs endpoint.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Job_postedById_createdAt_idx"
  ON "Job" ("postedById", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Job_companyId_idx"
  ON "Job" ("companyId");

CREATE INDEX IF NOT EXISTS "Job_isRemote_idx"
  ON "Job" ("isRemote");

CREATE INDEX IF NOT EXISTS "Job_salaryMax_idx"
  ON "Job" ("salaryMax");

CREATE INDEX IF NOT EXISTS "Job_techStack_gin_idx"
  ON "Job" USING GIN ("techStack");

CREATE INDEX IF NOT EXISTS "Job_title_trgm_idx"
  ON "Job" USING GIN ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Job_location_trgm_idx"
  ON "Job" USING GIN ("location" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Company_name_trgm_idx"
  ON "Company" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Application_userId_createdAt_idx"
  ON "Application" ("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Application_jobId_createdAt_idx"
  ON "Application" ("jobId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Application_status_idx"
  ON "Application" ("status");

CREATE INDEX IF NOT EXISTS "VerificationToken_expiresAt_idx"
  ON "VerificationToken" ("expiresAt");

CREATE INDEX IF NOT EXISTS "RecruiterProfile_companyId_idx"
  ON "RecruiterProfile" ("companyId");

CREATE INDEX IF NOT EXISTS "Skill_profileId_idx"
  ON "Skill" ("profileId");

CREATE INDEX IF NOT EXISTS "Language_profileId_idx"
  ON "Language" ("profileId");

CREATE INDEX IF NOT EXISTS "Experience_profileId_idx"
  ON "Experience" ("profileId");
