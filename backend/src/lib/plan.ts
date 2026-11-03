// src/lib/plan.ts — PRO-only feature gate
//
// Reads the plan from the database rather than the JWT: the access token can
// be up to 15 minutes stale right after an upgrade or downgrade.

import { Plan } from "@prisma/client";
import prisma from "./prisma";
import { AppError } from "./errors";

export async function assertPro(userId: string, feature: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  if (!user) throw AppError.notFound("User");
  if (user.plan !== Plan.PRO) {
    throw AppError.planLimit(`${feature} is a PRO feature. Upgrade to unlock it.`);
  }
}
