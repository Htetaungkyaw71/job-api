import { prisma } from "./lib/prisma.js";

async function main() {
  // Delete child records first to satisfy foreign key constraints.
  await prisma.$transaction([
    prisma.application.deleteMany(),
    prisma.skill.deleteMany(),
    prisma.language.deleteMany(),
    prisma.experience.deleteMany(),
    prisma.recruiterProfile.deleteMany(),
    prisma.job.deleteMany(),
    prisma.candidateProfile.deleteMany(),
    prisma.company.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log("All database records deleted.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Failed to delete data:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
