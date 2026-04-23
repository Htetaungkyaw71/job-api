import type { Response, Request, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user_id?: string;
      email?: string;
      role?: string;
    }
  }
}

export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // try Authorization header first, then httpOnly cookie `token`
    const authHeader = req.header("Authorization");

    let token: string | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else if ((req as any).cookies && (req as any).cookies.token) {
      token = String((req as any).cookies.token).trim();
    }

    if (!token || token === "undefined" || token === "null") {
      res.status(401).send("token is not found");
      return;
    }

    const secret = process.env.JWT_SECRET || "this is my secret";
    const validToken = jwt.verify(token, secret as string);
    if (typeof validToken !== "object" || !validToken.id) {
      res.status(401).send("token is not valid");
      return;
    }

    req.user_id = String(validToken.id);
    req.role = validToken.role;
    req.email = validToken.email;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).send("token is expired");
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).send("token is malformed");
      return;
    }

    res.status(500).send("Something went wrong");
  }
};
