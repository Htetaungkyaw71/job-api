import { Router } from "express";
import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma.js";
import { validate } from "../../validation/validate.js";
import { verifyToken } from "../../middlewares/authMiddleware.js";

import {
  createCandidateSchema,
  updateCandidateSchema,
  updateCandidateListsSchema,
} from "../../validation/candidate.schema.js";
import { allowRoles } from "../../middlewares/allowRole.js";
import { Prisma, Role } from "@prisma/client";

const router = Router();

router.get("/", verifyToken, async (req: Request, res: Response) => {
  try {
    const candidate = await prisma.candidateProfile.findMany({
      where: {
        userId: req.user_id || "",
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
});

router.post(
  "/",
  verifyToken,
  allowRoles(Role.CANDIDATE, Role.ADMIN),
  validate(createCandidateSchema),
  async (req: Request, res: Response) => {
    const {
      fullName,
      headline,
      description,
      cvUrl,
      cvFilename,
      location,
      openToRemote,
      expectedSalary,
      availability,
      jobStatus,
      visibility,
      skills,
      languages,
      experiences,
    } = req.body;

    if (req.role === "RECRUITER") {
      return res
        .status(403)
        .json({ message: "Only candidate can create candidate profile" });
    }
    const uid = req.user_id;

    if (!uid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // ✅ PRE-CHECK
      const existingCandidate = await prisma.candidateProfile.findUnique({
        where: { userId: uid || "" },
      });

      if (existingCandidate) {
        return res.status(409).json({
          message: "You already have a candidate profile",
        });
      }

      const createData: Prisma.CandidateProfileCreateInput = {
        fullName,
        availability,
        jobStatus,
        skills: {
          create: skills,
        },
        languages: {
          create: languages,
        },
        user: {
          connect: {
            id: uid,
          },
        },
      };

      if (headline !== undefined) createData.headline = headline;
      if (description !== undefined) createData.description = description;
      if (cvUrl !== undefined) createData.cvUrl = cvUrl;
      if (cvFilename !== undefined) createData.cvFilename = cvFilename;
      if (location !== undefined) createData.location = location;
      if (openToRemote !== undefined) createData.openToRemote = openToRemote;
      if (expectedSalary !== undefined)
        createData.expectedSalary = expectedSalary;
      if (visibility !== undefined) createData.visibility = visibility;
      if (experiences !== undefined) {
        createData.experiences = { create: experiences };
      }

      const candidate = await prisma.candidateProfile.create({
        data: createData,
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

router.put(
  "/",
  verifyToken,
  allowRoles(Role.CANDIDATE, Role.ADMIN),
  validate(updateCandidateSchema.merge(updateCandidateListsSchema)),
  async (req: Request, res: Response) => {
    const {
      fullName,
      headline,
      description,
      cvUrl,
      cvFilename,
      location,
      openToRemote,
      expectedSalary,
      availability,
      jobStatus,
      visibility,
      skills,
      languages,
      experiences,
    } = req.body;

    try {
      if (req.role === "RECRUITER") {
        return res.status(403).json({
          message: "Only candidate can update candidate profile",
        });
      }
      const existingCandidate = await prisma.candidateProfile.findUnique({
        where: { userId: req.user_id || "" },
      });

      if (!existingCandidate) {
        return res.status(409).json({
          message: "You do not have a candidate profile",
        });
      }

      const updateData: Prisma.CandidateProfileUpdateInput = {};

      if (fullName !== undefined) updateData.fullName = fullName;
      if (headline !== undefined) updateData.headline = headline;
      if (description !== undefined) updateData.description = description;
      if (cvUrl !== undefined) updateData.cvUrl = cvUrl;
      if (cvFilename !== undefined) updateData.cvFilename = cvFilename;
      if (location !== undefined) updateData.location = location;
      if (openToRemote !== undefined) updateData.openToRemote = openToRemote;
      if (expectedSalary !== undefined)
        updateData.expectedSalary = expectedSalary;
      if (availability !== undefined) updateData.availability = availability;
      if (jobStatus !== undefined) updateData.jobStatus = jobStatus;
      if (visibility !== undefined) updateData.visibility = visibility;

      if (skills !== undefined) {
        updateData.skills = {
          deleteMany: {},
          create: skills.map((skill: any) => ({
            name: skill.name,
            level: skill.level,
          })),
        };
      }

      if (languages !== undefined) {
        updateData.languages = {
          deleteMany: {},
          create: languages.map((language: any) => ({
            name: language.name,
            level: language.level,
          })),
        };
      }

      if (experiences !== undefined) {
        updateData.experiences = {
          deleteMany: {},
          create: experiences.map((experience: any) => ({
            companyName: experience.companyName,
            role: experience.role,
            description: experience.description,
            startDate: experience.startDate,
            endDate: experience.endDate,
            isCurrent: experience.isCurrent,
          })),
        };
      }

      const updateCandidate = await prisma.candidateProfile.update({
        where: {
          id: existingCandidate.id,
        },
        data: updateData,
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
