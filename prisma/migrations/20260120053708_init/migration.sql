/*
  Warnings:

  - You are about to drop the column `expectedSalaryMax` on the `CandidateProfile` table. All the data in the column will be lost.
  - You are about to drop the column `expectedSalaryMin` on the `CandidateProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CandidateProfile" DROP COLUMN "expectedSalaryMax",
DROP COLUMN "expectedSalaryMin",
ADD COLUMN     "expectedSalary" INTEGER;
