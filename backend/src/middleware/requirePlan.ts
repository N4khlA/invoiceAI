// src/middleware/requirePlan.ts — Gate endpoints behind PRO plan

import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";

/**
 * requirePlan("PRO") — returns middleware that rejects FREE users.
 * Must be used after authenticate().
 */
export function requirePlan(...plans: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(AppError.unauthorized());

    if (!plans.includes(req.user.plan)) {
      return next(
        AppError.planLimit(
          `This feature requires a ${plans.join(" or ")} plan. Please upgrade.`,
        ),
      );
    }
    next();
  };
}
