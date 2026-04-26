import type { Request, Response } from "express";
import { Router } from "express";
import { validate, validateParams } from "../../validation/validate.js";
import {
  createJobSchema,
  jobIdSchema,
  updateJobSchema,
} from "../../validation/job.schema.js";
import { verifyToken } from "../../middlewares/authMiddleware.js";
import { allowRoles } from "../../middlewares/allowRole.js";
import { JobLevel, JobType, Prisma, Role } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";

const router = Router();

const ONE_MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000;

function getDefaultExpiresAt() {
  return new Date(Date.now() + ONE_MONTH_IN_MS);
}

async function purgeExpiredJobs() {
  const expiredJobs = await prisma.job.findMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
    select: {
      id: true,
    },
  });

  if (expiredJobs.length === 0) {
    return;
  }

  const expiredJobIds = expiredJobs.map((job) => job.id);

  await prisma.$transaction([
    prisma.application.deleteMany({
      where: {
        jobId: {
          in: expiredJobIds,
        },
      },
    }),
    prisma.job.deleteMany({
      where: {
        id: {
          in: expiredJobIds,
        },
      },
    }),
  ]);
}

router.get("/", async (req: Request, res: Response) => {
  try {
    await purgeExpiredJobs();

    const firstQueryValue = (
      value: string | string[] | undefined,
    ): string | undefined => (Array.isArray(value) ? value[0] : value);

    const pageRaw = req.query.page;
    const limitRaw = req.query.limit;
    const typeRaw = req.query.type;
    const levelRaw = req.query.level;
    const isRemoteRaw = req.query.isRemote;
    const minSalaryRaw = req.query.minSalary;
    const searchRaw = req.query.search;
    const techRaw = req.query.tech;
    const sortRaw = req.query.sort;

    const page = Math.max(1, Number(pageRaw) || 1);
    const limit = Math.min(100, Math.max(1, Number(limitRaw) || 10));
    const skip = (page - 1) * limit;

    const type = firstQueryValue(typeRaw as string | string[] | undefined);
    const level = firstQueryValue(levelRaw as string | string[] | undefined);
    const isRemoteStr = firstQueryValue(
      isRemoteRaw as string | string[] | undefined,
    );
    const minSalaryValue = Number(
      firstQueryValue(minSalaryRaw as string | string[] | undefined),
    );
    const search =
      firstQueryValue(searchRaw as string | string[] | undefined) || "";
    const sort =
      firstQueryValue(sortRaw as string | string[] | undefined) || "newest";

    const techValues = (
      firstQueryValue(techRaw as string | string[] | undefined) || ""
    )
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const normalizedTechValues = techValues.map((value) => value.toLowerCase());

    const where: any = {};

    if (type && Object.values(JobType).includes(type as JobType)) {
      where.type = type;
    }

    if (level && Object.values(JobLevel).includes(level as JobLevel)) {
      where.level = level;
    }

    if (isRemoteStr === "true" || isRemoteStr === "false") {
      where.isRemote = isRemoteStr === "true";
    }

    if (!isNaN(minSalaryValue) && minSalaryValue >= 0) {
      // Only include jobs whose minimum salary meets the requested threshold.
      where.salaryMin = { gte: minSalaryValue };
    }

    if (search.trim()) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { company: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const orderBy =
      sort === "oldest"
        ? { createdAt: "asc" as const }
        : sort === "salary-high"
          ? { salaryMax: "desc" as const }
          : sort === "salary-low"
            ? { salaryMin: "asc" as const }
            : { createdAt: "desc" as const };

    const hasPaginationQuery =
      req.query.page !== undefined || req.query.limit !== undefined;

    const matchesTechStack = (jobTechStack: string[] | undefined) => {
      if (normalizedTechValues.length === 0) return true;

      const jobTechValues = (jobTechStack || []).map((value) =>
        value.toLowerCase(),
      );

      return normalizedTechValues.some((techValue) =>
        jobTechValues.some((jobTechValue) => jobTechValue === techValue),
      );
    };

    const applyTechFilter = <T extends { techStack: string[] }>(jobs: T[]) =>
      jobs.filter((job) => matchesTechStack(job.techStack));

    if (!hasPaginationQuery) {
      const jobs = await prisma.job.findMany({
        where,
        orderBy,
        include: {
          company: {
            select: {
              name: true,
              location: true,
              website: true,
              industry: true,
            },
          },
        },
      });

      return res.status(200).json(applyTechFilter(jobs));
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy,
      include: {
        company: {
          select: {
            name: true,
            location: true,
            website: true,
            industry: true,
          },
        },
      },
    });

    const filteredJobs = applyTechFilter(jobs);
    const total = filteredJobs.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paginatedJobs = filteredJobs.slice(skip, skip + limit);

    return res.status(200).json({
      data: paginatedJobs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Something went wrong");
  }
});

router.get(
  "/:id",
  validateParams(jobIdSchema),
  async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
      await purgeExpiredJobs();

      const jobDetail = await prisma.job.findFirst({
        where: {
          id: id,
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
        include: { company: true },
      });
      if (!jobDetail) {
        res.status(403).send("Job is not found");
        return;
      }
      res.status(200).json(jobDetail);
    } catch (error) {
      console.log(error);
      res.status(500).send("Something went wrong");
    }
  },
);

router.post(
  "/",
  verifyToken,
  allowRoles(Role.RECRUITER, Role.ADMIN),
  validate(createJobSchema),
  async (req: Request, res: Response) => {
    const data = req.body;

    if (req.role !== "RECRUITER") {
      return res.status(403).json({ message: "Only recruiters can post jobs" });
    }
    const uid = req.user_id;
    if (!uid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 2. Get recruiter profile + company
    const recruiter = await prisma.recruiterProfile.findUnique({
      where: {
        userId: uid,
      },
      select: { companyId: true },
    });

    try {
      const job = await prisma.job.create({
        data: {
          ...data,
          postedById: uid,
          companyId: recruiter?.companyId,
          expiresAt: getDefaultExpiresAt(),
        },
      });
      res.status(200).json(job);
    } catch (error) {
      console.log(error);
      res.status(500).send("Something went wrong");
    }
  },
);

router.put(
  "/:id",
  verifyToken,
  allowRoles(Role.RECRUITER, Role.ADMIN),
  validate(updateJobSchema),
  validateParams(jobIdSchema),
  async (req: Request, res: Response) => {
    const jobId = String(req.params.id);
    const uid = req.user_id;

    try {
      // 🔑 ADMIN can update any job
      const whereCondition =
        req.role === Role.ADMIN
          ? { id: jobId }
          : uid
            ? { id: jobId, postedById: uid }
            : { id: jobId, postedById: "" };

      const job = await prisma.job.findFirst({
        where: whereCondition,
      });

      if (!job) {
        return res.status(404).json({
          message: "Job not found or you are not the owner",
        });
      }

      const updatedJob = await prisma.job.update({
        where: { id: job.id },
        data: req.body,
      });

      res.status(200).json(updatedJob);
    } catch (error) {
      console.log(error);
      res.status(500).send("Something went wrong");
    }
  },
);

// router.put(
//   "/:id",
//   verifyToken,
//   allowRoles(Role.RECRUITER, Role.ADMIN),
//   validate(updateJobSchema),
//   validateParams,
//   async (req: Request, res: Response) => {
//     const id = req.params.id;
//     const data = req.body;
//     try {
//       const job = await prisma.job.findFirst({
//         where: {
//           id: +id,
//         },
//       });
//       if (!job) {
//         res.status(403).send("job is not found");
//         return;
//       }
//       const updateJob = await prisma.job.update({
//         where: {
//           id: job.id,
//         },
//         data: {
//           ...data,
//         },
//       });
//       res.status(201).json(updateJob);
//     } catch (error) {
//       console.log(error);
//       res.status(500).send("Something went wrong");
//     }
//   },
// );

router.delete(
  "/:id",
  verifyToken,
  allowRoles(Role.RECRUITER, Role.ADMIN),
  validateParams(jobIdSchema),
  async (req: Request, res: Response) => {
    const jobId = String(req.params.id);
    const uid = req.user_id;

    try {
      // 🔑 ADMIN can delete any job
      const whereCondition =
        req.role === Role.ADMIN
          ? { id: jobId }
          : uid
            ? { id: jobId, postedById: uid }
            : { id: jobId, postedById: "" };

      const job = await prisma.job.findFirst({
        where: whereCondition,
      });

      if (!job) {
        return res.status(404).json({
          message: "Job not found or you are not the owner",
        });
      }

      await prisma.$transaction([
        prisma.application.deleteMany({
          where: { jobId: job.id },
        }),
        prisma.job.delete({
          where: { id: job.id },
        }),
      ]);

      res.status(204).send(); // best practice
    } catch (error: unknown) {
      console.error("Failed to delete job", {
        jobId,
        userId: uid,
        role: req.role,
        error,
      });

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return res.status(400).json({
          message: `Delete job failed (${error.code})`,
        });
      }

      if (error instanceof Error) {
        return res.status(500).json({
          message: error.message,
        });
      }

      res.status(500).json({ message: "Something went wrong" });
    }
  },
);

// router.delete(
//   "/:id",
//   verifyToken,
//   allowRoles(Role.RECRUITER, Role.ADMIN),
//   validateParams,
//   async (req: Request, res: Response) => {
//     const id = req.params.id;
//     try {
//       const job = await prisma.job.findFirst({
//         where: {
//           id: +id,
//         },
//       });
//       if (!job) {
//         res.status(403).send("job is not found");
//         return;
//       }
//       const DeletedJob = await prisma.job.delete({
//         where: {
//           id: job.id,
//         },
//       });
//       res.status(201).json(DeletedJob);
//     } catch (error) {
//       console.log(error);
//       res.status(500).send("Something went wrong");
//     }
//   },
// );

export default router;
