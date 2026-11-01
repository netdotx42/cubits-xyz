import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";
import { mapStatus, productOf, shouldApply } from "@/lib/billing";

export const runtime = "nodejs";

const customerOf = (c: string | Stripe.Customer | Stripe.DeletedCustomer) => (typeof c === "string" ? c : c.id);

/** Finds the workspace for a subscription: metadata first, then the Stripe customer. */
async function findWorkspace(sub: Stripe.Subscription) {
  const admin = supabaseAdmin();
  const cols = "id, stripe_subscription_id, plan_status, agents_subscription_id, agents_status";
  const id = sub.metadata?.workspace_id;
  const { data } = id
    ? await admin.from("workspaces").select(cols).eq("id", id).maybeSingle()
    : await admin.from("workspaces").select(cols).eq("stripe_customer_id", customerOf(sub.customer)).maybeSingle();
  return data;
}

async function syncSubscription(fromEvent: Stripe.Subscription) {
  // Stripe does not guarantee event order, so read the subscription's current state instead of the payload.
  const sub = await stripe().subscriptions.retrieve(fromEvent.id).catch(() => fromEvent);
  if (!sub.metadata?.workspace_id && fromEvent.metadata?.workspace_id) sub.metadata = { ...sub.metadata, ...fromEvent.metadata };

  const ws = await findWorkspace(sub);
  if (!ws) {
    console.warn("stripe webhook: no workspace for subscription", sub.id);
    return;
  }
  const admin = supabaseAdmin();

  // Agents is a separate yearly subscription on the same customer; it must not touch the Cubits plan.
  if (productOf(sub) === "agents") {
    if (!shouldApply(ws.agents_subscription_id, ws.agents_status, sub.id)) {
      console.warn("stripe webhook: ignoring stale agents subscription", sub.id);
      return;
    }
    await admin.from("workspaces").update({
      agents_subscription_id: sub.id,
      agents_status: mapStatus(sub.status),
      agents_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    }).eq("id", ws.id);
    return;
  }

  if (!shouldApply(ws.stripe_subscription_id, ws.plan_status, sub.id)) {
    console.warn("stripe webhook: ignoring stale subscription", sub.id);
    return;
  }
  await admin.from("workspaces").update({
    stripe_subscription_id: sub.id,
    stripe_customer_id: customerOf(sub.customer),
    plan_status: mapStatus(sub.status),
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
  }).eq("id", ws.id);
}

/** A failed charge marks only the product whose subscription failed. */
async function markPaymentFailed(inv: Stripe.Invoice) {
  const subId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;
  if (!subId) return;
  const sub = await stripe().subscriptions.retrieve(subId);
  const admin = supabaseAdmin();
  if (productOf(sub) === "agents") {
    await admin.from("workspaces").update({ agents_status: "past_due" }).eq("agents_subscription_id", subId);
  } else {
    await admin.from("workspaces").update({ plan_status: "past_due" }).eq("stripe_subscription_id", subId);
  }
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const wsId = session.client_reference_id ?? session.metadata?.workspace_id;
        if (session.subscription) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const sub = await stripe().subscriptions.retrieve(subId);
          if (wsId && !sub.metadata?.workspace_id) {
            await supabaseAdmin().from("workspaces").update({ stripe_customer_id: customerOf(sub.customer) })
              .eq("id", wsId).is("stripe_customer_id", null);
            sub.metadata = { ...sub.metadata, workspace_id: wsId };
          }
          await syncSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await markPaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
  } catch (err) {
    console.error("stripe webhook handler failed", event.type, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
