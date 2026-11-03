// src/lib/stripe.ts — Shared Stripe client (subscriptions + client payments)

import Stripe from "stripe";
import { env } from "../config/env";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2026-02-25.clover" });
  }
  return _stripe;
}
