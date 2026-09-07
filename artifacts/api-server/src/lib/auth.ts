import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type SessionUser = {
  id: string;
  role: "CUSTOMER" | "PROVIDER" | "ADMIN";
  name: string;
  email: string;
};

const secret = () => process.env.JWT_SECRET ?? process.env.SESSION_SECRET ?? "local-development-secret";

export function signToken(user: SessionUser) {
  return jwt.sign(user, secret(), { expiresIn: "7d" });
}

export function getTokenUser(req: Request): SessionUser | null {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(header.slice(7), secret()) as SessionUser;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getTokenUser(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });
  req.user = user;
  next();
}

export function requireRole(...roles: SessionUser["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have access to this resource" });
    }
    next();
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}