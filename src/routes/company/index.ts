import { Router } from "express";
import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma.js";
import { validate, validateParams } from "../../validation/validate.js";
import { verifyToken } from "../../middlewares/authMiddleware.js";
import {
  createCompanySchema,
  updateCompanySchema,
} from "../../validation/company.schema.js";
import { allowRoles } from "../../middlewares/allowRole.js";
import { Role } from "../../../generated/prisma/enums.js";

const router = Router();

router.get(
  "/",
  verifyToken,
  allowRoles(Role.RECRUITER, Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const company = await prisma.company.findMany({
        where: {
          ownerId: req.user_id || "",
        },
      });
      res.status(200).json(company);
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
  validate(createCompanySchema),
  async (req: Request, res: Response) => {
    const data = req.body;
    console.log(data);

    if (req.role === "CANDIDATE") {
      return res
        .status(403)
        .json({ message: "Only recruiters can create company profile" });
    }
    const uid = req.user_id;
    if (!uid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

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
      res.status(500).send(error);
    }
  },
);

router.put(
  "/",
  verifyToken,
  allowRoles(Role.RECRUITER, Role.ADMIN),
  validate(updateCompanySchema),
  async (req: Request, res: Response) => {
    const data = req.body;
    const uid = req.user_id;

    if (!uid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const existingCompany = await prisma.company.findUnique({
        where: { ownerId: uid },
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

router.delete(
  "/",
  verifyToken,
  allowRoles(Role.RECRUITER, Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const existingCompany = await prisma.company.findUnique({
        where: { ownerId: req.user_id || "" },
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
