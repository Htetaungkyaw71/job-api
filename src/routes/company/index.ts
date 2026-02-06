import { Request, Response, Router } from "express";
import { prisma } from "../../../lib/prisma";
import { validate, validateParams } from "../../validation/validate";
import { verifyToken } from "../../middlewares/authMiddleware";
import {
  createCompanySchema,
  updateCompanySchema,
} from "../../validation/company.schema";
import { allowRoles } from "../../middlewares/allowRole";
import { Role } from "../../../generated/prisma/enums";

const router = Router();
/**
 * @swagger
 * /company:
 *   get:
 *     summary: Get company profile
 *     description: Get the company profile owned by the logged-in recruiter.
 *     tags:
 *       - Company
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Company'
 *       500:
 *         description: Server error
 */

router.get("/", async (req: Request, res: Response) => {
  try {
    const company = await prisma.company.findMany({
      where: {
        ownerId: req.user_id,
      },
    });
    res.status(200).json(company);
  } catch (error) {
    console.log(error);
    res.status(500).send("Something went wrong");
  }
});

/**
 * @swagger
 * /company:
 *   post:
 *     summary: Create company profile
 *     description: >
 *       Create a company profile.
 *       Only users with RECRUITER or ADMIN role can create a company.
 *     tags:
 *       - Company
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCompanyRequest'
 *     responses:
 *       200:
 *         description: Company created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Company'
 *       403:
 *         description: Only recruiters can create company profile
 *       409:
 *         description: Company profile already exists
 *       500:
 *         description: Server error
 */

router.post(
  "/",
  verifyToken,
  allowRoles(Role.RECRUITER, Role.ADMIN),
  validate(createCompanySchema),
  async (req: Request, res: Response) => {
    const data = req.body;

    if (req.role === "CANDIDATE") {
      return res
        .status(403)
        .json({ message: "Only recruiters can create company profile" });
    }
    const uid =
      typeof req.user_id === "string" ? parseInt(req.user_id) : req.user_id;

    try {
      // ✅ PRE-CHECK
      const existingCompany = await prisma.company.findUnique({
        where: { ownerId: uid },
      });

      if (existingCompany) {
        return res.status(409).json({
          message: "You already have a company profile",
        });
      }

      const company = await prisma.company.create({
        data: {
          ...data,
          ownerId: uid,
        },
      });
      res.status(200).json(company);
    } catch (error) {
      console.log(error);
      res.status(500).send("Something went wrong");
    }
  },
);

/**
 * @swagger
 * /company:
 *   put:
 *     summary: Update company profile
 *     description: >
 *       Update the logged-in recruiter's company profile.
 *       Only RECRUITER or ADMIN roles are allowed.
 *     tags:
 *       - Company
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCompanyRequest'
 *     responses:
 *       201:
 *         description: Company updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Company'
 *       409:
 *         description: Company profile not found
 *       500:
 *         description: Server error
 */

router.put(
  "/",
  verifyToken,
  allowRoles(Role.RECRUITER, Role.ADMIN),
  validate(updateCompanySchema),
  async (req: Request, res: Response) => {
    const data = req.body;

    try {
      const existingCompany = await prisma.company.findUnique({
        where: { ownerId: req.user_id },
      });

      if (!existingCompany) {
        return res.status(409).json({
          message: "You have no a company profile",
        });
      }

      const updateCompany = await prisma.company.update({
        where: {
          id: existingCompany.id,
        },
        data: {
          ...data,
        },
      });
      res.status(201).json(updateCompany);
    } catch (error) {
      console.log(error);
      res.status(500).send("Something went wrong");
    }
  },
);

/**
 * @swagger
 * /company:
 *   delete:
 *     summary: Delete company profile
 *     description: Delete the logged-in recruiter's company profile.
 *     tags:
 *       - Company
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Company deleted successfully
 *       409:
 *         description: Company profile not found
 *       500:
 *         description: Server error
 */

router.delete(
  "/",
  verifyToken,
  allowRoles(Role.RECRUITER, Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const existingCompany = await prisma.company.findUnique({
        where: { ownerId: req.user_id },
      });

      if (!existingCompany) {
        return res.status(409).json({
          message: "You have no a company profile",
        });
      }
      const company = await prisma.company.findFirst({
        where: {
          id: existingCompany.id,
        },
      });
      if (!company) {
        res.status(403).send("company is not found");
        return;
      }
      const Deletedcompany = await prisma.company.delete({
        where: {
          id: company.id,
        },
      });
      res.status(201).json(Deletedcompany);
    } catch (error) {
      console.log(error);
      res.status(500).send("Something went wrong");
    }
  },
);

export default router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Company:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *           example: 1
 *         name:
 *           type: string
 *           example: OpenAI
 *         description:
 *           type: string
 *           example: AI research company
 *         website:
 *           type: string
 *           example: https://openai.com
 *         location:
 *           type: string
 *           example: San Francisco, USA
 *         ownerId:
 *           type: number
 *           example: 10
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     CreateCompanyRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           example: OpenAI
 *         description:
 *           type: string
 *           example: AI research company
 *         website:
 *           type: string
 *           example: https://openai.com
 *         location:
 *           type: string
 *           example: San Francisco
 *
 *     UpdateCompanyRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateCompanyRequest'
 */
