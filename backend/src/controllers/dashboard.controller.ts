// src/controllers/dashboard.controller.ts

import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";
import { getDashboardSummary } from "../services/dashboard.service";

function getUserId(req: Request): string {
  const id = req.user?.sub;
  if (!id) throw AppError.unauthorized("Not authenticated");
  return id;
}

export async function summary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const data = await getDashboardSummary(userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
