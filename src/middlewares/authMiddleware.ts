import { Response, Request, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user_id?: number;
      email?: string;
      role?: string;
    }
  }
}

export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const bearer = req.header("Authorization");
    if (!bearer) {
      res.status(200).send("token is not found");
      return;
    }

    const [, token] = bearer?.split(" ");

    if (!token) {
      res.status(401);
      res.send("Not authorized");
      return;
    }

    const validToken = jwt.verify(token, "this is my secret");
    if (typeof validToken !== "object" || !validToken.id) {
      res.status(401).send("token is not valid");
      return;
    }

    req.user_id = +validToken.id;
    req.role = validToken.role;
    req.email = validToken.email;

    next();
  } catch (error) {
    res.status(500).send("Something went wrong");
  }
};
