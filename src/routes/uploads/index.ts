import { Router } from "express";
import type { Request, Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { verifyToken } from "../../middlewares/authMiddleware.js";
import { allowRoles } from "../../middlewares/allowRole.js";
import { Role } from "../../../generated/prisma/enums.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

cloudinary.config({ secure: true });

router.get(
  "/signature",
  verifyToken,
  allowRoles(Role.CANDIDATE, Role.ADMIN),
  (req: Request, res: Response) => {
    const cloudinarySecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudinarySecret) {
      return res
        .status(500)
        .json({ message: "Cloudinary secret is not configured" });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = "resumes";

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder,
      },
      cloudinarySecret,
    );

    return res.status(200).json({ signature, timestamp, folder });
  },
);

// router.post(
//   "/cv",
//   verifyToken,
//   allowRoles(Role.CANDIDATE, Role.ADMIN),
//   upload.single("file"),
//   async (req: Request, res: Response) => {
//     try {
//       const file = (req as Request & { file?: Express.Multer.File }).file;

//       if (!file) {
//         return res.status(400).json({ message: "file is required" });
//       }

//       const streamUpload = (buffer: Buffer) => {
//         return new Promise((resolve, reject) => {
//           const stream = cloudinary.uploader.upload_stream(
//             { folder: "cvs" },
//             (error, result) => {
//               if (result) resolve(result);
//               else reject(error);
//             },
//           );
//           streamifier.createReadStream(buffer).pipe(stream);
//         });
//       };

//       const result: any = await streamUpload(file.buffer);
//       res
//         .status(200)
//         .json({ url: result.secure_url, publicId: result.public_id });
//     } catch (error) {
//       console.error(error);
//       res.status(500).send("Upload failed");
//     }
//   },
// );

export default router;
