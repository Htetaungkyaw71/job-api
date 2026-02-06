import { email, z } from "zod";

// model RecruiterProfile {
//   id          Int      @id @default(autoincrement())
//   fullName    String
//   title       String      // HR Manager, Tech Recruiter
//   email       String
//   phone       String?
//   linkedinUrl String?

//   createdAt DateTime @default(now())

//   userId Int  @unique
//   user   User @relation(fields: [userId], references: [id])

//   companyId Int
//   company   Company @relation(fields: [companyId], references: [id])
// }

export const createRecuriterSchema = z.object({
  fullName: z
    .string()
    .min(2, "FullName must be at least 2 characters")
    .max(100),

  title: z.string().min(5, "Title must be at least 5 characters"),
  email: z.string(),
});

export const updateRecuriterSchema = createRecuriterSchema.partial();
