// src/middleware/rateLimiter.ts — Rate limiting presets

import rateLimit from "express-rate-limit";

/** Strict limiter for auth endpoints (login, register, refresh) */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

/** General API limiter for authenticated routes */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

/** AI endpoint limiter — expensive GPT calls */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: "AI rate limit exceeded, please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});
