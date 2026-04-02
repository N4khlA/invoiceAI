// src/middleware/authenticate.ts — Verify access JWT, set req.user

import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { AppError } from "../lib/errors";

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(AppError.unauthorized("Missing access token"));
  }

  const token = authHeader.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(AppError.unauthorized("Invalid or expired access token"));
  }
}
