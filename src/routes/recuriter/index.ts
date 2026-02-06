import { Request, Response, Router } from "express";
import { prisma } from "../../../lib/prisma";
import { validate } from "../../validation/validate";
import { verifyToken } from "../../middlewares/authMiddleware";
import {
  createRecuriterSchema,
  updateRecuriterSchema,
} from "../../validation/recuriter.schema";
import { allowRoles } from "../../middlewares/allowRole";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

/**
 * @swagger
 * /recruiter:
 *   get:
 *     summary: Get recruiter profile
 *     description: Get the recruiter profile of the logged-in user.
 *     tags:
 *       - Recruiter
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recruiter profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RecruiterProfile'
 *       500:
 *         description: Server error
 */

router.get("/", async (req: Request, res: Response) => {
  try {
    const recuriter = await prisma.recruiterProfile.findMany({
      where: {
        userId: req.user_id,
      },
    });
    res.status(200).json(recuriter);
  } catch (error) {
    console.log(error);
    res.status(500).send("Something went wrong");
  }
});

/**
 * @swagger
 * /recruiter:
 *   post:
 *     summary: Create recruiter profile
 *     description: >
 *       Create a recruiter profile.
 *       Only users with RECRUITER or ADMIN role can create a recruiter profile.
 *       A company profile must exist first.
 *     tags:
 *       - Recruiter
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRecruiterRequest'
 *     responses:
 *       200:
 *         description: Recruiter profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecruiterProfile'
 *       403:
 *         description: Only recruiters can create recruiter profile
 *       409:
 *         description: Company profile missing or recruiter profile already exists
 *       500:
 *         description: Server error
 */

router.post(
  "/",
  verifyToken,
  allowRoles(Role.RECRUITER, Role.ADMIN),
  validate(createRecuriterSchema),
  async (req: Request, res: Response) => {
    const data = req.body;

    if (req.role === "CANDIDATE") {
      return res
        .status(403)
        .json({ message: "Only recruiters can create recruiter profile" });
    }
    const uid =
      typeof req.user_id === "string" ? parseInt(req.user_id) : req.user_id;

    try {
      // ✅ PRE-CHECK
      const existingCompany = await prisma.company.findUnique({
        where: { ownerId: uid },
      });

      if (!existingCompany) {
        return res.status(409).json({
          message:
            "You don't have a company profile so please create company profile first",
        });
      }

      // ✅ PRE-CHECK
      const existingRecuriter = await prisma.recruiterProfile.findUnique({
        where: { userId: uid },
      });

      if (existingRecuriter) {
        return res.status(409).json({
          message: "You already have a recuriter profile",
        });
      }

      const recruiter = await prisma.recruiterProfile.create({
        data: {
          ...data,
          userId: uid,
          companyId: existingCompany.id,
        },
      });
      res.status(200).json(recruiter);
    } catch (error) {
      console.log(error);
      res.status(500).send("Something went wrong");
    }
  },
);

/**
 * @swagger
 * /recruiter:
 *   put:
 *     summary: Update recruiter profile
 *     description: Update the logged-in recruiter's profile.
 *     tags:
 *       - Recruiter
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRecruiterRequest'
 *     responses:
 *       201:
 *         description: Recruiter profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecruiterProfile'
 *       409:
 *         description: Recruiter profile not found
 *       500:
 *         description: Server error
 */

router.put(
  "/",
  verifyToken,
  allowRoles(Role.RECRUITER, Role.ADMIN),
  validate(updateRecuriterSchema),
  async (req: Request, res: Response) => {
    const data = req.body;

    try {
      const existingRecuriter = await prisma.recruiterProfile.findUnique({
        where: { userId: req.user_id },
      });

      if (!existingRecuriter) {
        return res.status(409).json({
          message: "You have no a recuriter profile",
        });
      }

      const updateRecuriter = await prisma.recruiterProfile.update({
        where: {
          id: existingRecuriter.id,
        },
        data: {
          ...data,
        },
      });
      res.status(201).json(updateRecuriter);
    } catch (error) {
      console.log(error);
      res.status(500).send("Something went wrong");
    }
  },
);

// router.delete("/", verifyToken, async (req: Request, res: Response) => {
//   try {
//     const existingRecuriter = await prisma.recruiterProfile.findUnique({
//       where: { userId: req.user_id },
//     });

//     if (!existingRecuriter) {
//       return res.status(409).json({
//         message: "You have no a recuriter profile",
//       });
//     }

//     const DeletedRecuriter = await prisma.recruiterProfile.delete({
//       where: {
//         id: existingRecuriter.id,
//       },
//     });
//     res.status(201).json(DeletedRecuriter);
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
 *     RecruiterProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *           example: 1
 *         fullName:
 *           type: string
 *           example: John Doe
 *         title:
 *           type: string
 *           example: Senior Recruiter
 *         email:
 *           type: string
 *           example: recruiter@company.com
 *         phone:
 *           type: string
 *           example: "+1 234 567 890"
 *         linkedinUrl:
 *           type: string
 *           example: https://linkedin.com/in/johndoe
 *         userId:
 *           type: number
 *         companyId:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     CreateRecruiterRequest:
 *       type: object
 *       required:
 *         - fullName
 *         - title
 *         - email
 *       properties:
 *         fullName:
 *           type: string
 *         title:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         linkedinUrl:
 *           type: string
 *
 *     UpdateRecruiterRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateRecruiterRequest'
 */
