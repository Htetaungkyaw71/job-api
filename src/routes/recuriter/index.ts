import { Router } from "express";
import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma.js";
import { validate } from "../../validation/validate.js";
import { verifyToken } from "../../middlewares/authMiddleware.js";
import {
  createRecuriterSchema,
  updateRecuriterSchema,
} from "../../validation/recuriter.schema.js";
import { allowRoles } from "../../middlewares/allowRole.js";
import { Role } from "@prisma/client";

const router = Router();

router.get(
  "/",
  verifyToken,
  allowRoles(Role.RECRUITER, Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const recuriter = await prisma.recruiterProfile.findMany({
        where: {
          userId: req.user_id || "",
        },
      });

      res.status(200).json(recuriter);
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
  validate(createRecuriterSchema),
  async (req: Request, res: Response) => {
    const data = req.body;

    if (req.role === "CANDIDATE") {
      return res
        .status(403)
        .json({ message: "Only recruiters can create recruiter profile" });
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

router.put(
  "/",
  verifyToken,
  allowRoles(Role.RECRUITER, Role.ADMIN),
  validate(updateRecuriterSchema),
  async (req: Request, res: Response) => {
    const data = req.body;
    const uid = req.user_id;

    if (!uid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const existingRecuriter = await prisma.recruiterProfile.findUnique({
        where: { userId: uid },
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
