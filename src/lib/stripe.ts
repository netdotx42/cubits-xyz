import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Shared Stripe client. Server only. The API version is pinned so an SDK upgrade cannot silently
 * change webhook payloads (for example, newer versions move current_period_end onto items).
 */
export function stripe() {
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });
  return client;
}

export const APP_URL = () => (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
