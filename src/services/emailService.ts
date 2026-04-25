import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

const SENDER_EMAIL = process.env.SENDER_EMAIL || "noreply@stackhire.com";

export async function sendSignupEmail(email: string, otpCode: string) {
  try {
    const result = await resend.emails.send({
      from: SENDER_EMAIL,
      to: email,
      subject: "Verify Your Email - StackHire",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to StackHire</h2>
          <p>Thank you for signing up! Please verify your email address to complete your registration.</p>
          
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #666;">Your verification code:</p>
            <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: #333; letter-spacing: 5px;">${otpCode}</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    if (result.error) {
      console.error("Failed to send signup email:", result.error);
      throw new Error("Failed to send verification email");
    }

    return result;
  } catch (error) {
    console.error("Email send error:", error);
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string, otpCode: string) {
  try {
    const result = await resend.emails.send({
      from: SENDER_EMAIL,
      to: email,
      subject: "Reset Your Password - StackHire",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password. Use the code below to proceed with the password reset.</p>
          
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #666;">Your reset code:</p>
            <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: #333; letter-spacing: 5px;">${otpCode}</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
        </div>
      `,
    });

    if (result.error) {
      console.error("Failed to send password reset email:", result.error);
      throw new Error("Failed to send reset email");
    }

    return result;
  } catch (error) {
    console.error("Email send error:", error);
    throw error;
  }
}
