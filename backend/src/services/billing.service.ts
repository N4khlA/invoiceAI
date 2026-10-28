// src/services/billing.service.ts
// Stripe checkout, portal, and webhook handling.
// All user data is updated only after verifying the Stripe webhook signature.
// Without Stripe keys (demo mode) checkout upgrades instantly and the portal
// is simulated, so the billing flow can be demoed end to end.

import Stripe from "stripe";
import { Plan } from "@prisma/client";
import prisma from "../lib/prisma";
import { AppError } from "../lib/errors";
import { env, features } from "../config/env";

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2026-02-25.clover" });
  }
  return _stripe;
}

// ── Plan helpers ─────────────────────────────────────────────────────────────

function priceIdToPlan(priceId: string): Plan {
  if (priceId === env.STRIPE_PRO_PRICE_ID) return Plan.PRO;
  return Plan.FREE;
}

// ── Checkout session ──────────────────────────────────────────────────────────

export async function createCheckoutSession(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, stripeCustomerId: true, plan: true },
  });
  if (!user) throw AppError.notFound("User");

  if (user.plan === Plan.PRO) {
    throw AppError.conflict("You are already on the PRO plan.");
  }

  if (!features.billing) {
    await prisma.user.update({
      where: { id: userId },
      data:  { plan: Plan.PRO, subscriptionStatus: "active", invoicesThisMonth: 0 },
    });
    return `${env.FRONTEND_URL}/billing?checkout=demo`;
  }

  const stripe = getStripe();

  // Reuse existing Stripe customer or create a new one
  let customerId = user.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: userId },
      data:  { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer:             customerId,
    payment_method_types: ["card"],
    mode:                 "subscription",
    line_items: [{ price: env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
    success_url: `${env.FRONTEND_URL}/billing?checkout=success`,
    cancel_url:  `${env.FRONTEND_URL}/billing?checkout=cancel`,
    metadata:    { userId },
  });

  if (!session.url) {
    throw AppError.internal("Failed to create Stripe checkout session — no URL returned.");
  }
  return session.url;
}

// ── Customer portal ───────────────────────────────────────────────────────────

export async function createPortalSession(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { stripeCustomerId: true, plan: true },
  });
  if (!user) throw AppError.notFound("User");

  if (!features.billing) {
    // Demo "portal": cancelling is the only action, so downgrade directly
    await prisma.user.update({
      where: { id: userId },
      data:  { plan: Plan.FREE, subscriptionStatus: "canceled" },
    });
    return `${env.FRONTEND_URL}/billing?portal=demo`;
  }

  if (!user.stripeCustomerId) {
    throw AppError.badRequest("No billing account found. Please subscribe first.");
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer:   user.stripeCustomerId,
    return_url: `${env.FRONTEND_URL}/billing`,
  });

  return session.url;
}

// ── Webhook ───────────────────────────────────────────────────────────────────

/**
 * Verifies the Stripe webhook signature and processes relevant events.
 * rawBody MUST be the original Buffer from express.raw().
 */
export async function handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
  if (!features.billing || !env.STRIPE_WEBHOOK_SECRET) {
    throw AppError.serviceUnavailable("Stripe is not configured.");
  }
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[billing.service] Webhook signature verification failed:", err);
    throw AppError.badRequest("Invalid Stripe webhook signature.");
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (!session.subscription || !session.customer) break;

        const userId = session.metadata?.userId;
        if (!userId) {
          console.error("[billing.service] checkout.session.completed: missing userId in metadata");
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

        await prisma.user.update({
          where: { id: userId },
          data:  {
            plan:                   Plan.PRO,
            stripeCustomerId:       session.customer as string,
            stripeSubscriptionId:   subscription.id,
            stripePriceId:          subscription.items.data[0]?.price.id ?? null,
            subscriptionStatus:     subscription.status,
            invoicesThisMonth:      0, // reset on upgrade
          },
        });

        console.log(`[billing.service] User ${userId} upgraded to PRO`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const plan = priceIdToPlan(sub.items.data[0]?.price.id ?? "");

        await prisma.user.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data:  {
            plan:               plan,
            stripePriceId:      sub.items.data[0]?.price.id ?? null,
            subscriptionStatus: sub.status,
          },
        });
        console.log(`[billing.service] Subscription ${sub.id} updated → plan=${plan}, status=${sub.status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        await prisma.user.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data:  {
            plan:               Plan.FREE,
            subscriptionStatus: sub.status,    // "canceled"
            stripeSubscriptionId: null,
            stripePriceId:        null,
          },
        });
        console.log(`[billing.service] Subscription ${sub.id} deleted — user downgraded to FREE`);
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        if (!customerId) break;

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data:  { subscriptionStatus: "past_due" },
        });
        console.log(`[billing.service] Payment failed for customer ${customerId}`);
        break;
      }

      default:
        // Silently ignore unhandled event types
        break;
    }
  } catch (err) {
    console.error(`[billing.service] Error processing event ${event.type}:`, err);
    // Re-throw so Express returns 500 and Stripe retries
    throw AppError.internal(`Failed to process webhook event: ${event.type}`);
  }
}

// ── Status helper ─────────────────────────────────────────────────────────────

export async function getBillingStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      plan:                 true,
      subscriptionStatus:   true,
      stripeSubscriptionId: true,
      stripePriceId:        true,
      invoicesThisMonth:    true,
    },
  });
  if (!user) throw AppError.notFound("User");
  return user;
}
