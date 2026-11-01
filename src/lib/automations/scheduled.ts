import { supabaseAdmin } from "@/lib/supabase/server";
import { executeAutomations } from "./engine";
import type { AutomationRow } from "./types";

type Item = { quantity?: number; qty?: number; unit_price?: number };

function invoiceTotal(items: unknown, taxRate: number): number {
  const list = Array.isArray(items) ? (items as Item[]) : [];
  const sub = list.reduce((s, i) => s + (Number(i.qty ?? i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
  return sub * (1 + (Number(taxRate) || 0) / 100);
}

async function summarize(workspaceId: string, since: string) {
  const db = supabaseAdmin();
  const [subs, created, paid, unpaid] = await Promise.all([
    db.from("submissions").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("created_at", since),
    db.from("invoices").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("kind", "invoice").gte("created_at", since),
    db.from("invoices").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("kind", "invoice").gte("paid_at", since),
    db.from("invoices").select("items, tax_rate").eq("workspace_id", workspaceId).eq("kind", "invoice").eq("status", "sent"),
  ]);
  const unpaidTotal = (unpaid.data ?? []).reduce(
    (s, r) => s + invoiceTotal((r as { items: unknown }).items, (r as { tax_rate: number }).tax_rate),
    0
  );
  return {
    new_submissions: subs.count ?? 0,
    invoices_created: created.count ?? 0,
    invoices_paid: paid.count ?? 0,
    unpaid_total: unpaidTotal.toFixed(2),
  };
}

export async function runScheduled(kind: "daily" | "weekly"): Promise<{ workspaces: number }> {
  const event = `schedule.${kind}`;
  const days = kind === "daily" ? 1 : 7;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabaseAdmin().from("automations").select("*").eq("trigger", event).eq("enabled", true);
  if (error) throw new Error(error.message);

  const byWorkspace = new Map<string, AutomationRow[]>();
  for (const a of (data ?? []) as AutomationRow[]) {
    const list = byWorkspace.get(a.workspace_id) ?? [];
    list.push(a);
    byWorkspace.set(a.workspace_id, list);
  }
  for (const [workspaceId, list] of byWorkspace) {
    try {
      const summary = await summarize(workspaceId, since);
      await executeAutomations(workspaceId, list, event, {
        period: kind === "daily" ? "last 24 hours" : "last 7 days",
        ...summary,
      });
    } catch (e) {
      console.error("scheduled run failed", workspaceId, e);
    }
  }
  return { workspaces: byWorkspace.size };
}
