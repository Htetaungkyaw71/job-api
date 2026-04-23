import { Router } from "express";
import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma.js";
import { validate, validateParams } from "../../validation/validate.js";
import { verifyToken } from "../../middlewares/authMiddleware.js";

import {
  createApplicationSchema,
  jobIdSchema,
} from "../../validation/job.schema.js";
import { allowRoles } from "../../middlewares/allowRole.js";
import { Role } from "@prisma/client";

const router = Router();

router.get(
  "/me",
  verifyToken,
  allowRoles(Role.CANDIDATE, Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const applications = await prisma.application.findMany({
        where: {
          userId: req.user_id || "",
        },
        include: {
          job: {
            include: {
              company: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.status(200).json(applications);
    } catch (error) {
      console.log(error);
      res.status(500).send("Something went wrong");
    }
  },
);

// Recuriter see application ->

router.get(
  "/:id",
  verifyToken,
  allowRoles(Role.RECRUITER, Role.ADMIN),
  validateParams(jobIdSchema),

  async (req: Request, res: Response) => {
    const rawJobId = req.params.id;
    const jobId = Array.isArray(rawJobId) ? rawJobId[0] : rawJobId;

    if (!jobId) {
      return res.status(400).json({ message: "Job id is required" });
    }

    console.log("jonId", jobId);
    try {
      if (req.role === "CANDIDATE") {
        return res.status(403).json({
          message: "Only recruiters can view job applicants",
        });
      }

      // ADMIN can access all jobs
      if (req.role !== Role.ADMIN) {
        const job = await prisma.job.findFirst({
          where: {
            id: jobId,
            postedById: req.user_id || "",
          },
          select: { id: true },
        });

        if (!job) {
          return res.status(404).json({
            message: "Job not found or you are not the owner",
          });
        }
      }
      const candidates = await prisma.application.findMany({
        where: {
          jobId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              createdAt: true,
              candidateProfile: true,
            },
          },
        },
      });

      res.status(200).json(candidates);
    } catch (error) {
      console.log(error);
      res.status(500).send("Something went wrong");
    }
  },
);

// candidate create applications

router.post(
  "/",
  verifyToken,
  allowRoles(Role.CANDIDATE, Role.ADMIN),
  validate(createApplicationSchema),
  async (req: Request, res: Response) => {
    const { jobId, status, name, email, cv_url } = req.body;

    if (req.role === "RECRUITER") {
      return res
        .status(403)
        .json({ message: "Only candidate can apply job applicants" });
    }
    const uid = req.user_id;
    if (!uid) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    try {
      const existingUser = await prisma.user.findUnique({
        where: { id: uid },
        select: { id: true, role: true },
      });

      if (!existingUser) {
        return res.status(401).json({
          message: "Your session is no longer valid. Please login again.",
        });
      }

      // ✅ PRE-CHECK
      const existingCandidate = await prisma.application.findFirst({
        where: {
          userId: uid,
          jobId,
        },
      });

      if (existingCandidate) {
        return res.status(409).json({
          message: "You already applied the positions",
        });
      }

      const candidate = await prisma.application.create({
        data: {
          status,
          jobId,
          userId: uid,
          name,
          email,
          cv_url,
        },
      });
      res.status(200).json(candidate);
    } catch (error: any) {
      if (error?.code === "P2003") {
        return res.status(400).json({
          message:
            "Invalid application relation. Please login again and retry.",
        });
      }

      console.log(error);
      res.status(500).send("Something went wrong");
    }
  },
);

// router.put(
//   "/",
//   verifyToken,
//   validate(updateCandidateSchema),
//   async (req: Request, res: Response) => {
//     const data = req.body;
//     const { skills, languages, experiences } = req.body;

//     try {
//       if (req.role === "RECRUITER") {
//         return res.status(403).json({
//           message: "Only candidate can update candidate profile",
//         });
//       }
//       const existingCandidate = await prisma.candidateProfile.findUnique({
//         where: { userId: req.user_id },
//       });

//       if (!existingCandidate) {
//         return res.status(409).json({
//           message: "You do not have a candidate profile",
//         });
//       }

//       const updateCandidate = await prisma.candidateProfile.update({
//         where: {
//           id: existingCandidate.id,
//         },
//         data: {
//           ...data,
//           skills: {
//             create: skills,
//           },
//           languages: {
//             create: languages,
//           },
//           experiences: experiences ? { create: experiences } : undefined,
//         },
//         include: {
//           skills: true,
//           languages: true,
//           experiences: true,
//         },
//       });
//       res.status(201).json(updateCandidate);
//     } catch (error) {
//       console.log(error);
//       res.status(500).send("Something went wrong");
//     }
//   },
// );

export default router;
