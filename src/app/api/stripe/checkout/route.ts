import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/workspace";
import { isOn } from "@/lib/access";
import { stripe, APP_URL } from "@/lib/stripe";
import { ensureCustomer, subscriptionHistory } from "@/lib/billing";
import { TRIAL_DAYS } from "@/lib/account";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { workspace, role, email } = await requireWorkspace({ allowUnpaid: true });
  if (role !== "owner") return NextResponse.json({ error: "Only the owner can manage billing." }, { status: 403 });

  // Already subscribed (or a payment is pending): manage it in the portal instead of starting a second plan.
  if (isOn(workspace.plan_status) || workspace.plan_status === "past_due") {
    return NextResponse.redirect(`${APP_URL()}/app/billing?msg=subscribed`, 303);
  }

  let interval = "monthly";
  try {
    const form = await req.formData();
    if (form.get("interval") === "annual") interval = "annual";
  } catch {
    /* no form body: default to monthly */
  }
  const priceId = interval === "annual" ? process.env.STRIPE_PRICE_ID_ANNUAL : process.env.STRIPE_PRICE_ID;
  if (!priceId) return NextResponse.json({ error: "Billing is not configured." }, { status: 500 });

  const customerId = await ensureCustomer(workspace, email);
  // The database can lag the webhook, so ask Stripe too.
  const history = await subscriptionHistory(customerId, "cubits");
  if (history.live) return NextResponse.redirect(`${APP_URL()}/app/billing?msg=subscribed`, 303);

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    payment_method_collection: "always",
    subscription_data: {
      // One free trial per workspace: a returning customer pays from day one.
      ...(history.trialUsed ? {} : { trial_period_days: TRIAL_DAYS }),
      metadata: { workspace_id: workspace.id, product: "cubits", interval },
    },
    client_reference_id: workspace.id,
    metadata: { workspace_id: workspace.id, product: "cubits" },
    success_url: `${APP_URL()}/app?welcome=${history.trialUsed ? "back" : "1"}`,
    cancel_url: `${APP_URL()}/app/billing`,
  });

  return NextResponse.redirect(session.url!, 303);
}
