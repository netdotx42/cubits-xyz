"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

const Settings = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  company_details: z.string().trim().max(1000),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter code like USD or EUR")
    .refine((c) => {
      try {
        new Intl.NumberFormat("en-US", { style: "currency", currency: c });
        return true;
      } catch {
        return false;
      }
    }, "Unknown currency code"),
  logo_url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https:\/\/[^\s"'<>]+$/.test(v), "Logo must be an https URL"),
});

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

/** Owner only. Workspace name, invoice details, currency and logo. */
export async function saveSettings(fd: FormData) {
  const { workspace, role } = await requireWorkspace({ allowUnpaid: true });
  if (role !== "owner") redirect("/app/settings?msg=forbidden");
  const parsed = Settings.safeParse({
    name: str(fd, "name"),
    company_details: str(fd, "company_details"),
    currency: str(fd, "currency"),
    logo_url: str(fd, "logo_url"),
  });
  if (!parsed.success) redirect(`/app/settings?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid settings")}`);
  const v = parsed.data;
  // Billing columns are not writable by users, so this goes through the service role, limited to these fields.
  const { error } = await supabaseAdmin()
    .from("workspaces")
    .update({ name: v.name, company_details: v.company_details || null, currency: v.currency, logo_url: v.logo_url || null })
    .eq("id", workspace.id);
  if (error) redirect(`/app/settings?error=${encodeURIComponent("Could not save settings.")}`);
  revalidatePath("/app", "layout");
  redirect("/app/settings?msg=saved");
}

/**
 * Owner only. Cancels both Stripe subscriptions immediately, then deletes the workspace and
 * everything in it (members, invoices, forms, submissions, automations, agents, keys).
 */
export async function deleteWorkspace(fd: FormData) {
  const { workspace, role } = await requireWorkspace({ allowUnpaid: true });
  if (role !== "owner") redirect("/app/settings?msg=forbidden");
  if (str(fd, "confirm").trim() !== workspace.name) {
    redirect(`/app/settings?error=${encodeURIComponent("Type the workspace name exactly to confirm.")}`);
  }
  const admin = supabaseAdmin();
  const { data: row } = await admin
    .from("workspaces").select("stripe_subscription_id, agents_subscription_id").eq("id", workspace.id).single();
  for (const subId of [row?.stripe_subscription_id, row?.agents_subscription_id]) {
    if (!subId) continue;
    try {
      const sub = await stripe().subscriptions.retrieve(subId);
      if (sub.status !== "canceled" && sub.status !== "incomplete_expired") await stripe().subscriptions.cancel(subId);
    } catch (e) {
      console.error("cancel on delete failed", subId, e);
      redirect(`/app/settings?error=${encodeURIComponent("Could not cancel the subscription. Nothing was deleted. Try again or contact support.")}`);
    }
  }
  const { error } = await admin.from("workspaces").delete().eq("id", workspace.id);
  if (error) redirect(`/app/settings?error=${encodeURIComponent("Could not delete the workspace.")}`);
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
