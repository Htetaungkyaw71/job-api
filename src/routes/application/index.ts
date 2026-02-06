import { Request, Response, Router } from "express";
import { prisma } from "../../../lib/prisma";
import { validate, validateParams } from "../../validation/validate";
import { verifyToken } from "../../middlewares/authMiddleware";

import { createApplicationSchema } from "../../validation/job.schema";
import { allowRoles } from "../../middlewares/allowRole";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

// Recuriter see application ->

/**
 * @swagger
 * /application/{id}:
 *   get:
 *     summary: View job applications
 *     description: >
 *       Recruiter can view candidates who applied to a job they posted.
 *       Admin can view applications for any job.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Job ID
 *     responses:
 *       200:
 *         description: List of candidates who applied for the job
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ApplicationResponse'
 *       403:
 *         description: Access denied (role not allowed)
 *       404:
 *         description: Job not found or user is not the owner
 *       500:
 *         description: Server error
 */

router.get(
  "/:id",
  verifyToken,
  allowRoles(Role.RECRUITER, Role.ADMIN),
  // validateParams,

  async (req: Request, res: Response) => {
    const jobId = +req.params.id;
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
            postedById: req.user_id,
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
/**
 * @swagger
 * /application:
 *   post:
 *     summary: Apply for a job
 *     description: Candidate applies for a job. Admin can also create applications.
 *     tags:
 *       - Applications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateApplicationRequest'
 *     responses:
 *       200:
 *         description: Application created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Application'
 *       403:
 *         description: Only candidates can apply for jobs
 *       409:
 *         description: Candidate already applied to this job
 *       400:
 *         description: Invalid user ID or request data
 *       500:
 *         description: Server error
 */

router.post(
  "/",
  verifyToken,
  allowRoles(Role.CANDIDATE, Role.ADMIN),
  validate(createApplicationSchema),
  async (req: Request, res: Response) => {
    const { jobId, status } = req.body;

    if (req.role === "RECRUITER") {
      return res
        .status(403)
        .json({ message: "Only candidate can apply job applicants" });
    }
    const uid =
      typeof req.user_id === "string" ? parseInt(req.user_id) : req.user_id;

    try {
      // ✅ PRE-CHECK
      const existingCandidate = await prisma.application.findFirst({
        where: {
          userId: uid,
        },
      });

      if (existingCandidate) {
        return res.status(409).json({
          message: "You already applied the positions",
        });
      }

      if (typeof uid !== "number" || isNaN(uid)) {
        return res.status(400).json({ message: "Invalid user id" });
      }

      const candidate = await prisma.application.create({
        data: {
          status,
          jobId,
          userId: uid,
        },
      });
      res.status(200).json(candidate);
    } catch (error) {
      console.log(error);
      res.status(500).send("Something went wrong");
    }
  },
);

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateApplicationRequest:
 *       type: object
 *       required:
 *         - jobId
 *         - status
 *       properties:
 *         jobId:
 *           type: integer
 *           example: 12
 *         status:
 *           type: string
 *           example: APPLIED
 *
 *     Application:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         status:
 *           type: string
 *         jobId:
 *           type: integer
 *         userId:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     ApplicationResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         status:
 *           type: string
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             email:
 *               type: string
 *             role:
 *               type: string
 *               enum: [ADMIN, RECRUITER, CANDIDATE]
 *             createdAt:
 *               type: string
 *               format: date-time
 *             candidateProfile:
 *               type: object
 *               nullable: true
 */

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
