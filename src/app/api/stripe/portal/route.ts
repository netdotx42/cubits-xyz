import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/workspace";
import { supabaseAdmin } from "@/lib/supabase/server";
import { stripe, APP_URL } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  const { workspace, role } = await requireWorkspace({ allowUnpaid: true });
  if (role !== "owner") return NextResponse.json({ error: "Only the owner can manage billing." }, { status: 403 });

  const { data: row } = await supabaseAdmin().from("workspaces").select("stripe_customer_id").eq("id", workspace.id).single();
  if (!row?.stripe_customer_id) return NextResponse.json({ error: "No billing account yet." }, { status: 400 });

  const session = await stripe().billingPortal.sessions.create({
    customer: row.stripe_customer_id,
    return_url: `${APP_URL()}/app/billing`,
  });
  return NextResponse.redirect(session.url, 303);
}
