import { Router } from "express";
import { prisma } from "../../../lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import {
  createUserSchema,
  loginUserSchema,
  registerInitialSchema,
  verifyOTPSchema,
  resendOTPSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../../validation/job.schema.js";
import { validate } from "../../validation/validate.js";
import { generateAndSaveOTP, verifyOTP } from "../../services/otpService.js";
import {
  sendSignupEmail,
  sendPasswordResetEmail,
} from "../../services/emailService.js";
import { VerificationType } from "@prisma/client";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many auth attempts, please try again later." },
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Too many password reset attempts, please try again later.",
  },
});

const isProduction =
  process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";
const sameSiteCookie: "none" | "lax" = isProduction ? "none" : "lax";
const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: sameSiteCookie,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/",
};

/**
 * POST /auth/login
 * Traditional login with email/password
 */
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

/**
 * POST /auth/register
 * Step 1: Request registration with email/password/role
 * Sends OTP to email
 */
router.post(
  "/register",
  authLimiter,
  validate(registerInitialSchema),
  async (req, res) => {
    const { email, password, role } = req.body;
    try {
      // Check if email already exists
      const existingUser = await prisma.user.findFirst({
        where: { email },
      });

      if (existingUser) {
        res.status(409).json({ message: "Email already registered" });
        return;
      }

      // Generate OTP and save to database
      const { code } = await generateAndSaveOTP(
        email,
        VerificationType.SIGNUP_VERIFICATION,
      );

      // Send OTP email
      await sendSignupEmail(email, code);

      // Store registration intent in session/temp (client should store these)
      res.status(200).json({
        message: "Verification code sent to your email",
        email,
        expiresIn: 600, // 10 minutes in seconds
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Failed to send verification email" });
    }
  },
);

/**
 * POST /auth/verify-otp
 * Step 2: Verify OTP and create user account
 */
router.post(
  "/verify-otp",
  authLimiter,
  validate(verifyOTPSchema),
  async (req, res) => {
    const { email, code } = req.body;
    try {
      // Note: password and role should be sent again by client or retrieved from a temporary storage
      // For now, we'll expect them in the request body
      const { password, role } = req.body;

      if (!password || !role) {
        res.status(400).json({ message: "Missing password or role" });
        return;
      }

      // Verify OTP
      await verifyOTP(email, code, VerificationType.SIGNUP_VERIFICATION);

      // Check again if user exists (race condition safety)
      const existingUser = await prisma.user.findFirst({
        where: { email },
      });

      if (existingUser) {
        res.status(409).json({ message: "Email already registered" });
        return;
      }

      // Create user
      const hashPassword = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashPassword,
          role,
          isEmailVerified: true,
        },
      });

      // Generate JWT token
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
        message: "Account created successfully",
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
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Verification failed" });
      }
    }
  },
);

/**
 * POST /auth/resend-otp
 * Resend OTP for registration
 */
router.post(
  "/resend-otp",
  authLimiter,
  validate(resendOTPSchema),
  async (req, res) => {
    const { email } = req.body;
    try {
      // Check if email exists
      const user = await prisma.user.findFirst({
        where: { email },
      });

      if (user) {
        res.status(409).json({ message: "Email already registered" });
        return;
      }

      // Generate new OTP
      const { code } = await generateAndSaveOTP(
        email,
        VerificationType.SIGNUP_VERIFICATION,
      );

      // Send email
      await sendSignupEmail(email, code);

      res.status(200).json({
        message: "Verification code sent to your email",
        expiresIn: 600,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Failed to send verification email" });
    }
  },
);

/**
 * POST /auth/forgot-password
 * Step 1: Request password reset
 * Sends reset code to email
 */
router.post(
  "/forgot-password",
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  async (req, res) => {
    const { email } = req.body;
    try {
      // Check if user exists
      const user = await prisma.user.findFirst({
        where: { email },
      });

      if (!user) {
        // Don't reveal whether email exists for security
        res.status(200).json({
          message: "If email exists, reset code will be sent",
        });
        return;
      }

      // Generate OTP for password reset
      const { code } = await generateAndSaveOTP(
        email,
        VerificationType.PASSWORD_RESET,
      );

      // Send reset email
      await sendPasswordResetEmail(email, code);

      res.status(200).json({
        message: "Password reset code sent to your email",
        expiresIn: 600,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Failed to send reset email" });
    }
  },
);

/**
 * POST /auth/reset-password
 * Step 2: Reset password with OTP verification
 */
router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  async (req, res) => {
    const { email, code, newPassword } = req.body;
    try {
      // Verify OTP
      await verifyOTP(email, code, VerificationType.PASSWORD_RESET);

      // Find user
      const user = await prisma.user.findFirst({
        where: { email },
      });

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      res.status(200).json({
        message: "Password reset successfully",
      });
    } catch (error) {
      console.log(error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Password reset failed" });
      }
    }
  },
);

export default router;
