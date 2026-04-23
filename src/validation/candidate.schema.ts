import { z } from "zod";

// model CandidateProfile {
//   id          Int      @id @default(autoincrement())
//   headline    String?
//   description String?

//   location     String?
//   openToRemote Boolean @default(true)

//   expectedSalaryMin Int?
//   expectedSalaryMax Int?

//   availability Availability
//   jobStatus    JobStatus

//   visibility   ProfileVisibility @default(RECRUITERS_ONLY)

//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt

//   userId Int  @unique
//   user   User @relation(fields: [userId], references: [id])

//   skills      Skill[]
//   languages   Language[]
//   experiences Experience[]
// }

// enum Availability {
//   IMMEDIATE
//   TWO_WEEKS
//   ONE_MONTH
//   NEGOTIABLE
// }

// enum JobStatus {
//   ACTIVELY_LOOKING
//   OPEN_TO_OFFERS
//   NOT_LOOKING
// }

const AvailabilityEnum = z.enum([
  "IMMEDIATE",
  "TWO_WEEKS",
  "ONE_MONTH",
  "NEGOTIABLE",
]);

const JobStatusEnum = z.enum([
  "ACTIVELY_LOOKING",
  "OPEN_TO_OFFERS",
  "NOT_LOOKING",
]);

const SkillLevelEnum = z.enum([
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
]);

const LanguageLevelEnum = z.enum([
  "BASIC",
  "CONVERSATIONAL",
  "FLUENT",
  "NATIVE",
]);
export const skillSchema = z.object({
  name: z.string().min(1, "Skill name is required"),
  level: SkillLevelEnum,
});

export const languageSchema = z.object({
  name: z.string().min(1, "Language name is required"),
  level: LanguageLevelEnum,
});

export const experienceSchema = z
  .object({
    companyName: z.string().min(1),
    role: z.string().min(1),
    description: z.string().optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    isCurrent: z.boolean().optional(),
  })
  .refine((data) => !(data.isCurrent && data.endDate), {
    message: "Current job should not have endDate",
    path: ["endDate"],
  });

export const createCandidateSchema = z.object({
  headline: z.string().min(3).optional(),
  description: z.string().min(10).optional(),

  location: z.string().optional(),
  openToRemote: z.boolean().optional(),

  expectedSalary: z.number().positive().optional(),

  availability: AvailabilityEnum,
  jobStatus: JobStatusEnum,

  skills: z.array(skillSchema).min(1, "At least one skill is required"),
  languages: z
    .array(languageSchema)
    .min(1, "At least one language is required"),

  experiences: z.array(experienceSchema).optional(),
});

export const updateCandidateSchema = createCandidateSchema.partial();

export const updateCandidateListsSchema = z
  .object({
    skills: z.array(skillSchema).optional(),
    languages: z.array(languageSchema).optional(),
    experiences: z.array(experienceSchema).optional(),
  })
  .partial();
