import type { Request, Response, NextFunction } from "express";
import { Role } from "../../generated/prisma/enums.js";

export const allowRoles = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.role || !roles.includes(req.role as Role)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }
    next();
  };
};
