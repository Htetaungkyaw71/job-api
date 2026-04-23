import { Router } from "express";
import { prisma } from "../../../lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import {
  createUserSchema,
  loginUserSchema,
} from "../../validation/job.schema.js";
import { validate } from "../../validation/validate.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many auth attempts, please try again later." },
});

const isSecureCookie = process.env.COOKIE_SECURE === "true";
const sameSiteCookie: "none" | "lax" = isSecureCookie ? "none" : "lax";
const authCookieOptions = {
  httpOnly: true,
  secure: isSecureCookie,
  sameSite: sameSiteCookie,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/",
};

router.post(
  "/login",
  authLimiter,
  validate(loginUserSchema),
  async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await prisma.user.findFirst({
        where: {
          email: email,
        },
      });
      if (!user) {
        res.status(401).send("email is not found");
        return;
      }
      const isValidPasswod = await bcrypt.compare(password, user.password);
      console.log(isValidPasswod, "aa", password, user.password);

      if (!isValidPasswod) {
        res.status(401).send("password is wrong");
        return;
      }
      const secret = process.env.JWT_SECRET || "stack_hire_2000";
      const token = jwt.sign(
        { email: user.email, id: user.id, role: user?.role },
        secret,
        {
          expiresIn: "30d",
        },
      );

      res.cookie("token", token, authCookieOptions);
      res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.log(error);
      res.status(500).send("Something went wrong");
    }
  },
);

router.post(
  "/register",
  authLimiter,
  validate(createUserSchema),
  async (req, res) => {
    const { email, password, role } = req.body;
    try {
      if (role === "ADMIN") {
        res.status(401).send("Access denied");
        return;
      }
      const user = await prisma.user.findFirst({
        where: {
          email: email,
        },
      });
      if (user) {
        res.status(401).send("email is already exist");
        return;
      }
      const hashPassword = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashPassword,
          role,
        },
      });
      const secret = process.env.JWT_SECRET || "stack_hire_2000";
      const token = jwt.sign(
        { email: newUser.email, id: newUser.id, role: newUser.role },
        secret,
        {
          expiresIn: "30d",
        },
      );

      res.cookie("token", token, authCookieOptions);
      res.status(201).json({
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          createdAt: newUser.createdAt,
        },
      });
    } catch (error) {
      console.log(error);
      res.status(500).send("Something went wrong");
    }
  },
);

export default router;
