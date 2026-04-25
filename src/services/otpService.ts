import { prisma } from "../../lib/prisma.js";
import { VerificationType } from "@prisma/client";
import crypto from "crypto";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

/**
 * Generate a random 6-digit OTP code
 */
function generateOTPCode(): string {
  return crypto
    .randomInt(0, Math.pow(10, OTP_LENGTH))
    .toString()
    .padStart(OTP_LENGTH, "0");
}

/**
 * Generate and save OTP to database
 */
export async function generateAndSaveOTP(
  email: string,
  type: VerificationType,
) {
  // Invalidate any existing OTPs for this email and type
  await prisma.verificationToken.updateMany({
    where: { email, type },
    data: { isUsed: true },
  });

  const code = generateOTPCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const token = await prisma.verificationToken.create({
    data: {
      email,
      code,
      type,
      expiresAt,
    },
  });

  return {
    code: token.code,
    expiresAt: token.expiresAt,
  };
}

/**
 * Verify OTP code
 */
export async function verifyOTP(
  email: string,
  code: string,
  type: VerificationType,
) {
  const token = await prisma.verificationToken.findFirst({
    where: {
      email,
      code,
      type,
    },
  });

  if (!token) {
    throw new Error("Invalid verification code");
  }

  if (token.isUsed) {
    throw new Error("Verification code has already been used");
  }

  if (token.expiresAt < new Date()) {
    throw new Error("Verification code has expired");
  }

  // Mark as used
  await prisma.verificationToken.update({
    where: { id: token.id },
    data: { isUsed: true },
  });

  return token;
}

/**
 * Get latest unused OTP for an email
 */
export async function getLatestOTP(email: string, type: VerificationType) {
  return prisma.verificationToken.findFirst({
    where: {
      email,
      type,
      isUsed: false,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
