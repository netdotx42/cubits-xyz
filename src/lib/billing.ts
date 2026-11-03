import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

export type Product = "cubits" | "agents";

/** Stripe price ids that belong to each product. */
export function productPrices(product: Product): string[] {
  const ids =
    product === "agents"
      ? [process.env.STRIPE_PRICE_ID_AGENTS]
      : [process.env.STRIPE_PRICE_ID, process.env.STRIPE_PRICE_ID_ANNUAL];
  return ids.filter((v): v is string => Boolean(v));
}

export function productOf(sub: Pick<Stripe.Subscription, "items" | "metadata">): Product {
  if (sub.metadata?.product === "agents") return "agents";
  const agents = process.env.STRIPE_PRICE_ID_AGENTS;
  return agents && sub.items.data.some((i) => i.price.id === agents) ? "agents" : "cubits";
}

/** Subscription statuses that still bill, or will once payment is fixed. */
const LIVE: Stripe.Subscription.Status[] = ["trialing", "active", "past_due", "unpaid", "incomplete"];

/**
 * What this customer already has for a product: a live subscription (block a second checkout)
 * and whether any subscription ever existed (the free trial is used up).
 */
export async function subscriptionHistory(customerId: string, product: Product) {
  const subs: Stripe.Subscription[] = [];
  for await (const s of stripe().subscriptions.list({ customer: customerId, status: "all", limit: 100 })) {
    if (productOf(s) === product) subs.push(s);
    if (subs.length >= 100) break;
  }
  return {
    live: subs.find((s) => LIVE.includes(s.status)) ?? null,
    trialUsed: subs.length > 0,
  };
}

/** The workspace's Stripe customer, created once. The idempotency key stops two tabs creating two. */
export async function ensureCustomer(workspace: { id: string; name: string }, email: string): Promise<string> {
  const admin = supabaseAdmin();
  const { data: row } = await admin.from("workspaces").select("stripe_customer_id").eq("id", workspace.id).single();
  if (row?.stripe_customer_id) return row.stripe_customer_id as string;
  const c = await stripe().customers.create(
    { email, name: workspace.name, metadata: { workspace_id: workspace.id } },
    { idempotencyKey: `customer-${workspace.id}` }
  );
  // Only set it if still empty, so a concurrent request cannot overwrite a different id.
  await admin.from("workspaces").update({ stripe_customer_id: c.id }).eq("id", workspace.id).is("stripe_customer_id", null);
  const { data: again } = await admin.from("workspaces").select("stripe_customer_id").eq("id", workspace.id).single();
  return (again?.stripe_customer_id as string | null) ?? c.id;
}

export type PlanStatus = "none" | "trialing" | "active" | "past_due" | "canceled";

export function mapStatus(s: Stripe.Subscription.Status): PlanStatus {
  switch (s) {
    case "trialing": return "trialing";
    case "active": return "active";
    case "past_due":
    case "unpaid": return "past_due";
    case "canceled":
    case "incomplete_expired": return "canceled";
    default: return "none"; // incomplete, paused
  }
}

/**
 * Whether an event about subscription `incomingId` may change the workspace. It may when the
 * workspace has no subscription yet, when it is the same subscription, or when the stored one
 * is no longer live. This stops a late event about an old subscription from overwriting the current one.
 */
export function shouldApply(storedId: string | null | undefined, storedStatus: string | null | undefined, incomingId: string): boolean {
  if (!storedId || storedId === incomingId) return true;
  return !(storedStatus === "trialing" || storedStatus === "active" || storedStatus === "past_due");
}
