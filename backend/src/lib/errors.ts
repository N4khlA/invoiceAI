// src/lib/errors.ts — Typed application errors

export enum ErrorCode {
  UNAUTHORIZED        = "UNAUTHORIZED",
  FORBIDDEN           = "FORBIDDEN",
  NOT_FOUND           = "NOT_FOUND",
  VALIDATION_ERROR    = "VALIDATION_ERROR",
  CONFLICT            = "CONFLICT",
  INTERNAL_ERROR      = "INTERNAL_ERROR",
  PLAN_LIMIT_REACHED  = "PLAN_LIMIT_REACHED",
  BAD_REQUEST         = "BAD_REQUEST",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
}

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly code: ErrorCode,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, new.target.prototype);
  }

  // Convenience factories
  static unauthorized(msg = "Unauthorized"): AppError {
    return new AppError(msg, ErrorCode.UNAUTHORIZED, 401);
  }
  static forbidden(msg = "Forbidden"): AppError {
    return new AppError(msg, ErrorCode.FORBIDDEN, 403);
  }
  static notFound(resource = "Resource"): AppError {
    return new AppError(`${resource} not found`, ErrorCode.NOT_FOUND, 404);
  }
  static conflict(msg: string): AppError {
    return new AppError(msg, ErrorCode.CONFLICT, 409);
  }
  static validation(msg: string, details?: unknown): AppError {
    return new AppError(msg, ErrorCode.VALIDATION_ERROR, 422, details);
  }
  static planLimit(msg = "Upgrade to PRO to continue"): AppError {
    return new AppError(msg, ErrorCode.PLAN_LIMIT_REACHED, 402);
  }
  static internal(msg = "Internal server error"): AppError {
    return new AppError(msg, ErrorCode.INTERNAL_ERROR, 500);
  }
  static badRequest(msg: string): AppError {
    return new AppError(msg, ErrorCode.BAD_REQUEST, 400);
  }
  static serviceUnavailable(msg = "Service unavailable", code?: string): AppError {
    return new AppError(msg, (code as ErrorCode) ?? ErrorCode.SERVICE_UNAVAILABLE, 503);
  }
}
