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

  salaryMin: priceSchema.optional(),
  salaryMax: priceSchema.optional(),
  techStack: z.array(z.string()),
  isRemote: z.boolean(),
  externalJob: z.boolean().optional(),
  applyLink: z.string().url("applyLink must be a valid URL").optional(),
  logo: z.string().url("logo must be a valid URL").optional(),
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
  jobId: z.uuid(),
  name: z.string().min(2, "name must be at least 2 characters"),
  email: z.email(),
  cv_url: z.url("cv_url must be a valid URL"),

  status: z.enum(["APPLIED", "INTERVIEW", "OFFER", "REJECTED"]).optional(),
});

export const applicationStatusSchema = z.enum([
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
]);

export const updateApplicationStatusSchema = z.object({
  status: applicationStatusSchema,
});

export const applicationIdSchema = z.object({
  id: z.uuid(),
});

/**
 * Update → all fields optional
 */
export const updateJobSchema = createJobSchema.partial();

/**
 * Params validation (id)
 */
export const jobIdSchema = z.object({
  id: z.uuid(),
});

/**
 * OTP and Authentication Schemas
 */
export const registerInitialSchema = z.object({
  email: z.email(),
  password: z.string().min(6, "password must be at least 6 characters"),
  role: z.enum(["RECRUITER", "CANDIDATE"]),
});

export const verifyOTPSchema = z.object({
  email: z.email(),
  code: z.string().length(6, "OTP must be 6 digits"),
});

export const resendOTPSchema = z.object({
  email: z.email(),
});

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export const resetPasswordSchema = z.object({
  email: z.email(),
  code: z.string().length(6, "Reset code must be 6 digits"),
  newPassword: z.string().min(6, "password must be at least 6 characters"),
});
