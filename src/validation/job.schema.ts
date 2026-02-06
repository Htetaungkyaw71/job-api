import { z } from "zod";

/**
 * Common reusable fields
 */

// {
//       "title": "Junior Backend Developer",
//       "description": "Backend developer position",
//       "location": "Yangon Myanmar",
//       "salaryMax": 3000000,
//       "salaryMin": 2000000,
//       "techStack": ["nodejs","prisma","postgre","api","expressjs"],
//       "isRemote": true,
//       "level": "SENIOR",
//       "type": "FULL_TIME"
// }

const priceSchema = z
  .union([z.string(), z.number()])
  .refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0,
    "salary must be a valid positive number",
  );

export const createJobSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(100),

  description: z.string().min(5, "Description must be at least 5 characters"),
  location: z.string(),

  salaryMin: priceSchema,
  salaryMax: priceSchema,
  techStack: z.array(z.string()),
  isRemote: z.boolean(),
  level: z.enum(["JUNIOR", "MID", "SENIOR", "LEAD"]),
  type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE"]),
});

export const createUserSchema = z.object({
  email: z.email(),
  password: z.string().min(5, "password must be at least 5 characters"),
  role: z.enum(["ADMIN", "RECRUITER", "CANDIDATE"]),
});

export const loginUserSchema = z.object({
  email: z.email(),
  password: z.string().min(5, "password must be at least 5 characters"),
});

export const createApplicationSchema = z.object({
  jobId: z.int(),

  status: z
    .enum(["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFER", "REJECTED"])
    .optional(),
});

/**
 * Update → all fields optional
 */
export const updateJobSchema = createJobSchema.partial();

/**
 * Params validation (id)
 */
export const jobIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});
