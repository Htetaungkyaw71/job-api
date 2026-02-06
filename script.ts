import { prisma } from "./lib/prisma";

async function main() {
  // Create a new user with a post
  const user = await prisma.job.create({
    data: {
      title: "Frontend Developer",
      description: "Junior frontend developer position",
      location: "Yangon Myanmar",
      salaryMax: 3000000,
      salaryMin: 2000000,
      techStack: ["html,css,javascript,nodejs,prisma"],
      isRemote: true,
      level: "JUNIOR",
      type: "FULL_TIME",
    },
  });
  console.log("Created user:", user);

  // Fetch all users with their posts
  const allUsers = await prisma.job.findMany({});
  console.log("All users:", JSON.stringify(allUsers, null, 2));
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

// example of job ->
// {
//  "title": "Frontend Developer",
//       "description": "Junior frontend developer position",
//       "location": "Yangon Myanmar",
//       "salaryMax": 3000000,
//       "salaryMin": 2000000,
//       "techStack": ["html,css,javascript,nodejs,prisma"],
//       "isRemote": true,
//       "level": "JUNIOR",
//       "type": "FULL_TIME",
// }

// {
//       "name": "TechX",
//       "description": "software house company",
//       "website": "www.techhouse.com",
//       "industry": "tech",
//       "size":"STARTUP",
//       "foundedYear": 2020,
//       "location": "Yangon Myanmar",
//       "hiringStatus": "ACTIVELY_HIRING",
// }

// {
//       "fullName": "kyaw htet win",
//       "title": "IT recuriter",
//       "email": "kyaw@gmail.com",
//       "phone": "09420012345",
//       "linkedinUrl":"www.linkedin.com/kyawgyi",
// }

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

// {
//   "headline": "Frontend Developer",
//   "description": "Specialized in React",
//   "location": "Yangon",
//   "expectedSalaryMin": 2000000,
//   "expectedSalaryMax": 3000000,
//   "availability": "IMMEDIATE",
//   "jobStatus": "ACTIVELY_LOOKING",
//   "skills": [
//     {
//       "name": "React",
//       "level": "ADVANCED"
//     },
//     {
//       "name": "TypeScript",
//       "level": "INTERMEDIATE"
//     }
//   ],
//   "languages": [
//     {
//       "name": "English",
//       "level": "FLUENT"
//     },
//     {
//       "name": "Burmese",
//       "level": "NATIVE"
//     }
//   ],
//   "experiences": [
//     {
//       "companyName": "ABC Tech",
//       "role": "Frontend Developer",
//       "description": "Worked on dashboards",
//       "startDate": "2022-01-01T00:00:00.000Z",
//       "endDate": "2023-06-01T00:00:00.000Z",
//       "isCurrent": false
//     }
//   ]
// }
