import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PlanStatus = "none" | "trialing" | "active" | "past_due" | "canceled";

function mapStatus(s: Stripe.Subscription.Status): PlanStatus {
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

async function syncSubscription(sub: Stripe.Subscription) {
  const admin = supabaseAdmin();
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  // Agents is a separate yearly subscription on the same customer; it must not touch the Cubits plan.
  if (process.env.STRIPE_PRICE_ID_AGENTS && sub.items.data.some((i) => i.price.id === process.env.STRIPE_PRICE_ID_AGENTS)) {
    const agents = {
      agents_subscription_id: sub.id,
      agents_status: mapStatus(sub.status),
      agents_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    };
    const id = sub.metadata?.workspace_id;
    await (id ? admin.from("workspaces").update(agents).eq("id", id) : admin.from("workspaces").update(agents).eq("stripe_customer_id", customerId));
    return;
  }
  const update = {
    stripe_subscription_id: sub.id,
    stripe_customer_id: customerId,
    plan_status: mapStatus(sub.status),
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
  };
  const wsId = sub.metadata?.workspace_id;
  if (wsId) {
    await admin.from("workspaces").update(update).eq("id", wsId);
  } else {
    await admin.from("workspaces").update(update).eq("stripe_customer_id", customerId);
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
            await supabaseAdmin().from("workspaces").update({
              stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
            }).eq("id", wsId);
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
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        if (customerId) {
          await supabaseAdmin().from("workspaces").update({ plan_status: "past_due" }).eq("stripe_customer_id", customerId);
        }
        break;
      }
    }
  } catch (err) {
    console.error("stripe webhook handler failed", event.type, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
