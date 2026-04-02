// src/types/express.d.ts — Augment Express Request with auth context

import { JwtPayload } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
