import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/workspace";
import { supabaseAdmin } from "@/lib/supabase/server";
import { stripe, APP_URL } from "@/lib/stripe";

export const runtime = "nodejs";

/** $499/year Agents add-on. Same 7-day trial, card upfront. */
export async function POST() {
  const { workspace, role, email } = await requireWorkspace({ allowUnpaid: true });
  if (role !== "owner") return NextResponse.json({ error: "Only the owner can manage billing." }, { status: 403 });
  const priceId = process.env.STRIPE_PRICE_ID_AGENTS;
  if (!priceId) return NextResponse.json({ error: "Agents billing is not configured." }, { status: 500 });
  if (["trialing", "active"].includes(workspace.agents_status)) return NextResponse.redirect(`${APP_URL()}/app/agents`, 303);

  const admin = supabaseAdmin();
  const { data: row } = await admin.from("workspaces").select("stripe_customer_id").eq("id", workspace.id).single();
  let customerId = row?.stripe_customer_id as string | null | undefined;
  if (!customerId) {
    const c = await stripe().customers.create({ email, name: workspace.name, metadata: { workspace_id: workspace.id } });
    customerId = c.id;
    await admin.from("workspaces").update({ stripe_customer_id: customerId }).eq("id", workspace.id);
  }
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    payment_method_collection: "always",
    subscription_data: { trial_period_days: 7, metadata: { workspace_id: workspace.id, product: "agents" } },
    client_reference_id: workspace.id,
    metadata: { workspace_id: workspace.id, product: "agents" },
    success_url: `${APP_URL()}/app/agents?welcome=1`,
    cancel_url: `${APP_URL()}/app/agents`,
  });
  return NextResponse.redirect(session.url!, 303);
}
