import { Request, Response, Router } from "express";
import { prisma } from "../../../lib/prisma";
import { validate, validateParams } from "../../validation/validate";
import { createJobSchema, updateJobSchema } from "../../validation/job.schema";
import { verifyToken } from "../../middlewares/authMiddleware";
import { allowRoles } from "../../middlewares/allowRole";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

/**
 * @swagger
 * /jobs:
 *   get:
 *     summary: Get all jobs
 *     description: Public endpoint to fetch all job listings.
 *     tags:
 *       - Jobs
 *     responses:
 *       200:
 *         description: List of jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Job'
 *       500:
 *         description: Server error
 */

router.get("/", async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.job.findMany({});
    res.status(200).json(jobs);
  } catch (error) {
    console.log(error);
    res.status(500).send("Something went wrong");
  }
});

/**
 * @swagger
 * /jobs/{id}:
 *   get:
 *     summary: Get job details
 *     description: Fetch job details by job ID.
 *     tags:
 *       - Jobs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Job details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Job'
 *       403:
 *         description: Job not found
 *       500:
 *         description: Server error
 */

router.get("/:id", validateParams, async (req: Request, res: Response) => {
  const id = +req.params.id;
  try {
    const jobDetail = await prisma.job.findFirst({
      where: {
        id: id,
      },
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
});

/**
 * @swagger
 * /jobs:
 *   post:
 *     summary: Create job
 *     description: >
 *       Create a new job posting.
 *       Only RECRUITER or ADMIN can create jobs.
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateJobRequest'
 *     responses:
 *       200:
 *         description: Job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Job'
 *       403:
 *         description: Only recruiters can post jobs
 *       500:
 *         description: Server error
 */

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
    const uid =
      typeof req.user_id === "string" ? parseInt(req.user_id) : req.user_id;

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
        },
      });
      res.status(200).json(job);
    } catch (error) {
      console.log(error);
      res.status(500).send("Something went wrong");
    }
  },
);

/**
 * @swagger
 * /jobs/{id}:
 *   put:
 *     summary: Update job
 *     description: Update an existing job posting.
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateJobRequest'
 *     responses:
 *       201:
 *         description: Job updated successfully
 *       403:
 *         description: Job not found or access denied
 *       500:
 *         description: Server error
 */

router.put(
  "/:id",
  verifyToken,
  allowRoles(Role.RECRUITER, Role.ADMIN),
  validate(updateJobSchema),
  validateParams,
  async (req: Request, res: Response) => {
    const jobId = Number(req.params.id);
    const uid =
      typeof req.user_id === "string" ? Number(req.user_id) : req.user_id;

    try {
      // 🔑 ADMIN can update any job
      const whereCondition =
        req.role === Role.ADMIN
          ? { id: jobId }
          : { id: jobId, postedById: uid };

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

/**
 * @swagger
 * /jobs/{id}:
 *   delete:
 *     summary: Delete job
 *     description: Delete a job posting.
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       201:
 *         description: Job deleted successfully
 *       403:
 *         description: Job not found or access denied
 *       500:
 *         description: Server error
 */

router.delete(
  "/:id",
  verifyToken,
  allowRoles(Role.RECRUITER, Role.ADMIN),
  validateParams,
  async (req: Request, res: Response) => {
    const jobId = Number(req.params.id);
    const uid =
      typeof req.user_id === "string" ? Number(req.user_id) : req.user_id;

    try {
      // 🔑 ADMIN can delete any job
      const whereCondition =
        req.role === Role.ADMIN
          ? { id: jobId }
          : { id: jobId, postedById: uid };

      const job = await prisma.job.findFirst({
        where: whereCondition,
      });

      if (!job) {
        return res.status(404).json({
          message: "Job not found or you are not the owner",
        });
      }

      await prisma.job.delete({
        where: { id: job.id },
      });

      res.status(204).send(); // best practice
    } catch (error) {
      console.log(error);
      res.status(500).send("Something went wrong");
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

/**
 * @swagger
 * components:
 *   schemas:
 *     Job:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *         title:
 *           type: string
 *           example: Frontend Developer
 *         description:
 *           type: string
 *         salary:
 *           type: number
 *         location:
 *           type: string
 *         companyId:
 *           type: number
 *         postedById:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     CreateJobRequest:
 *       type: object
 *       required:
 *         - title
 *         - description
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         salary:
 *           type: number
 *         location:
 *           type: string
 *
 *     UpdateJobRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateJobRequest'
 */
