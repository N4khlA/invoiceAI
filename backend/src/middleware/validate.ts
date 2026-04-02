// src/middleware/validate.ts — Zod schema validation middleware

import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { AppError } from "../lib/errors";

type ValidateTarget = "body" | "query" | "params";

/**
 * validate(schema, target?) — validate request body/query/params against a Zod schema.
 * Attaches the parsed data back to req[target] so downstream code gets typed values.
 */
export function validate<T>(schema: ZodSchema<T>, target: ValidateTarget = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[target]);
      // Overwrite with coerced/transformed values
      (req as unknown as Record<string, unknown>)[target] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(AppError.validation("Validation failed", err.flatten().fieldErrors));
      } else {
        next(err);
      }
    }
  };
}
