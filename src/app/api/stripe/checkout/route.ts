import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/workspace";
import { supabaseAdmin } from "@/lib/supabase/server";
import { stripe, APP_URL } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { workspace, role, email } = await requireWorkspace({ allowUnpaid: true });
  if (role !== "owner") return NextResponse.json({ error: "Only the owner can manage billing." }, { status: 403 });

  let interval = "monthly";
  try {
    const form = await req.formData();
    if (form.get("interval") === "annual") interval = "annual";
  } catch {
    /* no form body: default to monthly */
  }
  const priceId = interval === "annual" ? process.env.STRIPE_PRICE_ID_ANNUAL : process.env.STRIPE_PRICE_ID;
  if (!priceId) return NextResponse.json({ error: "Billing is not configured." }, { status: 500 });

  const admin = supabaseAdmin();
  const { data: row } = await admin.from("workspaces").select("stripe_customer_id").eq("id", workspace.id).single();
  let customerId = row?.stripe_customer_id as string | null | undefined;

  if (!customerId) {
    const customer = await stripe().customers.create({
      email,
      name: workspace.name,
      metadata: { workspace_id: workspace.id },
    });
    customerId = customer.id;
    await admin.from("workspaces").update({ stripe_customer_id: customerId }).eq("id", workspace.id);
  }

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    payment_method_collection: "always",
    subscription_data: { trial_period_days: 7, metadata: { workspace_id: workspace.id, interval } },
    client_reference_id: workspace.id,
    metadata: { workspace_id: workspace.id },
    success_url: `${APP_URL()}/app?welcome=1`,
    cancel_url: `${APP_URL()}/app/billing`,
  });

  return NextResponse.redirect(session.url!, 303);
}
