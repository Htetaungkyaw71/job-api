import { Router } from "express";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createUserSchema, loginUserSchema } from "../../validation/job.schema";
import { validate } from "../../validation/validate";

const router = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     description: Login with email and password and receive a JWT token.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid email or password
 *       500:
 *         description: Server error
 */

router.post("/login", validate(loginUserSchema), async (req, res) => {
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

    if (!isValidPasswod) {
      res.status(401).send("password is wrong");
      return;
    }
    const token = jwt.sign(
      { email: user.email, id: user.id, role: user?.role },
      "this is my secret",
      {
        expiresIn: "30d",
      },
    );
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
});

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: User registration
 *     description: >
 *       Register a new user. ADMIN role registration is not allowed.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Email already exists or role not allowed
 *       500:
 *         description: Server error
 */

router.post("/register", validate(createUserSchema), async (req, res) => {
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
    const token = jwt.sign(
      { email: newUser.email, id: newUser.id, role: newUser.role },
      "this is my secret",
      {
        expiresIn: "30d",
      },
    );

    res.status(201).send({
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
});

export default router;

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           example: user@example.com
 *         password:
 *           type: string
 *           example: password123
 *
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - role
 *       properties:
 *         email:
 *           type: string
 *           example: user@example.com
 *         password:
 *           type: string
 *           example: password123
 *         role:
 *           type: string
 *           enum: [CANDIDATE, RECRUITER]
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               example: 1
 *             email:
 *               type: string
 *               example: user@example.com
 *             role:
 *               type: string
 *               example: CANDIDATE
 *             createdAt:
 *               type: string
 *               format: date-time
 */
