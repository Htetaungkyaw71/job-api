import { Request, Response, Router } from "express";
import { prisma } from "../../../lib/prisma";
import { validate } from "../../validation/validate";
import { verifyToken } from "../../middlewares/authMiddleware";

import {
  createCandidateSchema,
  updateCandidateSchema,
} from "../../validation/candidate.schema";
import { allowRoles } from "../../middlewares/allowRole";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

/**
 * @swagger
 * /candidate:
 *   get:
 *     summary: Get candidate profile
 *     description: Get the logged-in user's candidate profile.
 *     tags:
 *       - Candidate
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Candidate profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CandidateProfile'
 *       500:
 *         description: Server error
 */

router.get("/", async (req: Request, res: Response) => {
  try {
    const candidate = await prisma.candidateProfile.findMany({
      where: {
        userId: req.user_id,
      },
    });
    res.status(200).json(candidate);
  } catch (error) {
    console.log(error);
    res.status(500).send("Something went wrong");
  }
});

/**
 * @swagger
 * /candidate:
 *   post:
 *     summary: Create candidate profile
 *     description: >
 *       Create a candidate profile. Only users with CANDIDATE or ADMIN role
 *       can create a candidate profile.
 *     tags:
 *       - Candidate
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCandidateRequest'
 *     responses:
 *       200:
 *         description: Candidate profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CandidateProfile'
 *       403:
 *         description: Only candidates can create profiles
 *       409:
 *         description: Candidate profile already exists
 *       500:
 *         description: Server error
 */

router.post(
  "/",
  verifyToken,
  allowRoles(Role.CANDIDATE, Role.ADMIN),
  validate(createCandidateSchema),
  async (req: Request, res: Response) => {
    const data = req.body;
    const { skills, languages, experiences } = req.body;

    if (req.role === "RECRUITER") {
      return res
        .status(403)
        .json({ message: "Only candidate can create candidate profile" });
    }
    const uid =
      typeof req.user_id === "string" ? parseInt(req.user_id) : req.user_id;

    try {
      // ✅ PRE-CHECK
      const existingCandidate = await prisma.candidateProfile.findUnique({
        where: { userId: uid },
      });

      if (existingCandidate) {
        return res.status(409).json({
          message: "You already have a candidate profile",
        });
      }

      const candidate = await prisma.candidateProfile.create({
        data: {
          ...data,
          skills: {
            create: skills,
          },
          languages: {
            create: languages,
          },
          experiences: experiences ? { create: experiences } : undefined,
          userId: uid,
        },
        include: {
          skills: true,
          languages: true,
          experiences: true,
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
 * /candidate:
 *   put:
 *     summary: Update candidate profile
 *     description: >
 *       Update the logged-in user's candidate profile.
 *       Only CANDIDATE or ADMIN roles are allowed.
 *     tags:
 *       - Candidate
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCandidateRequest'
 *     responses:
 *       201:
 *         description: Candidate profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CandidateProfile'
 *       403:
 *         description: Only candidates can update profiles
 *       409:
 *         description: Candidate profile not found
 *       500:
 *         description: Server error
 */

router.put(
  "/",
  verifyToken,
  allowRoles(Role.CANDIDATE, Role.ADMIN),
  validate(updateCandidateSchema),
  async (req: Request, res: Response) => {
    const data = req.body;
    const { skills, languages, experiences } = req.body;

    try {
      if (req.role === "RECRUITER") {
        return res.status(403).json({
          message: "Only candidate can update candidate profile",
        });
      }
      const existingCandidate = await prisma.candidateProfile.findUnique({
        where: { userId: req.user_id },
      });

      if (!existingCandidate) {
        return res.status(409).json({
          message: "You do not have a candidate profile",
        });
      }

      const updateCandidate = await prisma.candidateProfile.update({
        where: {
          id: existingCandidate.id,
        },
        data: {
          ...data,
          skills: {
            create: skills,
          },
          languages: {
            create: languages,
          },
          experiences: experiences ? { create: experiences } : undefined,
        },
        include: {
          skills: true,
          languages: true,
          experiences: true,
        },
      });
      res.status(201).json(updateCandidate);
    } catch (error) {
      console.log(error);
      res.status(500).send("Something went wrong");
    }
  },
);

// router.delete("/", verifyToken, async (req: Request, res: Response) => {
//   try {
//     if (req.role === "RECRUITER") {
//       return res.status(403).json({
//         message: "Only candidate can delete candidate profile",
//       });
//     }
//     const existingCandidate = await prisma.candidateProfile.findUnique({
//       where: { userId: req.user_id },
//     });

//     if (!existingCandidate) {
//       return res.status(409).json({
//         message: "You have no a candidate profile",
//       });
//     }

//     const DeletedCandidate = await prisma.candidateProfile.delete({
//       where: {
//         id: existingCandidate.id,
//       },
//       include: {
//         skills: true,
//         languages: true,
//         experiences: true,
//       },
//     });
//     res.status(201).json(DeletedCandidate);
//   } catch (error) {
//     console.log(error);
//     res.status(500).send("Something went wrong");
//   }
// });

export default router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Skill:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: JavaScript
 *
 *     Language:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: English
 *         level:
 *           type: string
 *           example: Fluent
 *
 *     Experience:
 *       type: object
 *       properties:
 *         company:
 *           type: string
 *           example: Google
 *         role:
 *           type: string
 *           example: Frontend Developer
 *         years:
 *           type: number
 *           example: 2
 *
 *     CreateCandidateRequest:
 *       type: object
 *       required:
 *         - skills
 *         - languages
 *       properties:
 *         bio:
 *           type: string
 *           example: Passionate frontend developer
 *         skills:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Skill'
 *         languages:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Language'
 *         experiences:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Experience'
 *
 *     UpdateCandidateRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateCandidateRequest'
 *
 *     CandidateProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *           example: 1
 *         bio:
 *           type: string
 *           example: Passionate frontend developer
 *         skills:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Skill'
 *         languages:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Language'
 *         experiences:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Experience'
 *         userId:
 *           type: number
 *           example: 10
 */
