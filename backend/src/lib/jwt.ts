// src/lib/jwt.ts — JWT utilities

import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";

export interface JwtPayload {
  sub: string;   // userId
  email: string;
  plan: string;
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRY as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw new Error("Invalid or expired token");
  }
}

export function generateRefreshToken(): string {
  return crypto.randomUUID();
}
