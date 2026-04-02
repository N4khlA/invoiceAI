// src/middleware/errorHandler.ts — Global error handler

import { Request, Response, NextFunction } from "express";
import { AppError, ErrorCode } from "../lib/errors";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors (from validate() middleware)
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Validation failed",
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Unknown errors
  if (process.env.NODE_ENV !== "production") {
    console.error("[Unhandled Error]", err);
  }

  res.status(500).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: "An unexpected error occurred",
    },
  });
}
