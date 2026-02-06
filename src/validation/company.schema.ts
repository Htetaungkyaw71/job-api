import { z } from "zod";

/**
 * Common reusable fields
 */

//  id          Int      @id @default(autoincrement())
//   name        String
//   description String
//   website     String?
//   industry    String
//   size        CompanySize
//   foundedYear Int?
//   location    String

//   hiringStatus HiringStatus
//   verified     Boolean @default(false)

//   createdAt DateTime @default(now())

//   ownerId Int   @unique
//   owner   User  @relation(fields: [ownerId], references: [id])

//   recruiters RecruiterProfile[]
//   jobs       Job[]

export const createCompanySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),

  description: z.string().min(5, "Description must be at least 5 characters"),
  location: z.string(),
  industry: z.string(),

  hiringStatus: z.enum(["ACTIVELY_HIRING", "LIMITED_HIRING", "NOT_HIRING"]),
  size: z.enum(["STARTUP", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"]),
});

/**
 * Update → all fields optional
 */
export const updateCompanySchema = createCompanySchema.partial();

/**
 * Params validation (id)
 */
export const companyIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});
