import Stripe from "stripe";

let client: Stripe | null = null;

/** Shared Stripe client. Server only. */
export function stripe() {
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!);
  return client;
}

export const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
