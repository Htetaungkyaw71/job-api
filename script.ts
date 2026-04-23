import { prisma } from "./lib/prisma.js";
import bcrypt from "bcryptjs";
import fs from "node:fs/promises";
import {
  CompanySize,
  HiringStatus,
  JobLevel,
  JobType,
  Role,
} from "@prisma/client";

type ScrapedJob = {
  title?: string;
  description?: string;
  location?: string;
  isRemote?: boolean;
  externalJob?: boolean;
  company_name?: string;
  salary?: string;
  applyLink?: string;
  logo?: string;
  tech_stack?: string[];
  level?: string;
  type?: string;
};

function normalizeJobLevel(value?: string): JobLevel {
  const v = (value || "").toUpperCase();
  if (v.includes("JUNIOR")) return JobLevel.JUNIOR;
  if (v.includes("SENIOR")) return JobLevel.SENIOR;
  if (v.includes("LEAD") || v.includes("PRINCIPAL") || v.includes("STAFF")) {
    return JobLevel.LEAD;
  }
  return JobLevel.MID;
}

function normalizeJobType(value?: string): JobType {
  const v = (value || "").toUpperCase();
  if (v.includes("PART")) return JobType.PART_TIME;
  if (v.includes("FREELANCE")) return JobType.FREELANCE;
  if (v.includes("CONTRACT") || v.includes("B2B")) return JobType.CONTRACT;
  return JobType.FULL_TIME;
}

async function main() {
  const jsonPath = new URL("./todays_jobs.json", import.meta.url);
  const jsonRaw = await fs.readFile(jsonPath, "utf8");
  const scrapedJobs = JSON.parse(jsonRaw) as ScrapedJob[];

  const oneMonthLater = new Date();
  oneMonthLater.setDate(oneMonthLater.getDate() + 30);

  // Reset job-related data before import.
  await prisma.application.deleteMany();
  await prisma.job.deleteMany();

  const hashedPassword = await bcrypt.hash("password123", 10);

  const recruiter = await prisma.user.upsert({
    where: { email: "recruiter@example.com" },
    update: {
      role: Role.RECRUITER,
    },
    create: {
      email: "recruiter@example.com",
      password: hashedPassword,
      role: Role.RECRUITER,
    },
  });

  const company =
    (await prisma.company.findFirst({
      where: { ownerId: recruiter.id },
    })) ||
    (await prisma.company.create({
      data: {
        name: "StackHire Labs",
        description: "Imported external jobs from justjoin.it feed.",
        website: "https://justjoin.it",
        industry: "Technology",
        size: CompanySize.MEDIUM,
        foundedYear: 2021,
        location: "Poland",
        hiringStatus: HiringStatus.ACTIVELY_HIRING,
        ownerId: recruiter.id,
      },
    }));

  await prisma.recruiterProfile.upsert({
    where: { userId: recruiter.id },
    update: {
      companyId: company.id,
      email: recruiter.email,
    },
    create: {
      fullName: "Recruiter One",
      title: "Senior Recruiter",
      email: recruiter.email,
      phone: "09420012345",
      linkedinUrl: "https://www.linkedin.com/in/recruiter-one",
      userId: recruiter.id,
      companyId: company.id,
    },
  });

  let createdCount = 0;
  let skippedCount = 0;

  for (const job of scrapedJobs) {
    const title = job.title?.trim();
    const description = job.description?.trim();
    const location = job.location?.trim();

    if (!title || !description || !location) {
      skippedCount += 1;
      continue;
    }

    const existing = await prisma.job.findFirst({
      where: {
        title,
        location,
        companyId: company.id,
      },
      select: { id: true },
    });

    if (existing) {
      skippedCount += 1;
      continue;
    }

    const techStack = Array.isArray(job.tech_stack)
      ? job.tech_stack.map((t) => t.trim()).filter(Boolean)
      : [];

    await prisma.job.create({
      data: {
        title,
        description,
        location,
        isRemote: Boolean(job.isRemote),
        externalJob: true,
        company_name: job.company_name?.trim() || null,
        salary: job.salary?.trim() || null,
        applyLink: job.applyLink?.trim() || null,
        logo: job.logo?.trim() || null,
        salaryMin: null,
        salaryMax: null,
        techStack,
        level: normalizeJobLevel(job.level),
        type: normalizeJobType(job.type),
        expiresAt: oneMonthLater,
        companyId: company.id,
        postedById: recruiter.id,
      },
    });

    createdCount += 1;
  }

  console.log("Import complete");
  console.log({
    recruiter: { id: recruiter.id, email: recruiter.email },
    company: { id: company.id, name: company.name },
    jobsFromFile: scrapedJobs.length,
    jobsCreated: createdCount,
    jobsSkipped: skippedCount,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
