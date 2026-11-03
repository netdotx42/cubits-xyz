import { NextResponse } from "next/server";
import { hasAgentsAccess, requireWorkspace } from "@/lib/workspace";
import { stripe, APP_URL } from "@/lib/stripe";
import { ensureCustomer, subscriptionHistory } from "@/lib/billing";
import { TRIAL_DAYS } from "@/lib/account";

export const runtime = "nodejs";

/** $499/year Agents add-on. 7-day trial (first time only), card upfront. */
export async function POST() {
  const { workspace, role, email } = await requireWorkspace({ allowUnpaid: true });
  if (role !== "owner") return NextResponse.json({ error: "Only the owner can manage billing." }, { status: 403 });
  const priceId = process.env.STRIPE_PRICE_ID_AGENTS;
  if (!priceId) return NextResponse.json({ error: "Agents billing is not configured." }, { status: 500 });
  if (hasAgentsAccess(workspace) || workspace.agents_status === "past_due") return NextResponse.redirect(`${APP_URL()}/app/agents`, 303);

  const customerId = await ensureCustomer(workspace, email);
  const history = await subscriptionHistory(customerId, "agents");
  if (history.live) return NextResponse.redirect(`${APP_URL()}/app/agents`, 303);

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    payment_method_collection: "always",
    subscription_data: {
      ...(history.trialUsed ? {} : { trial_period_days: TRIAL_DAYS }),
      metadata: { workspace_id: workspace.id, product: "agents" },
    },
    client_reference_id: workspace.id,
    metadata: { workspace_id: workspace.id, product: "agents" },
    success_url: `${APP_URL()}/app/agents?welcome=1`,
    cancel_url: `${APP_URL()}/app/agents`,
  });
  return NextResponse.redirect(session.url!, 303);
}
