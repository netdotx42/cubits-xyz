"use server";
import { z } from "zod";
import { requireWorkspace } from "@/lib/workspace";
import { supabaseServer } from "@/lib/supabase/server";
import { emit } from "@/lib/events";
import { sendEmail } from "@/lib/email";
import { escapeHtml, calcTotals, money, fmtDate, type LineItem } from "@/components/cubits/util";

const InvoiceInput = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(["invoice", "quote"]),
  client_name: z.string().trim().min(1, "Client name is required").max(200),
  client_email: z.string().trim().email("Invalid client email").or(z.literal("")).optional(),
  items: z
    .array(
      z.object({
        description: z.string().max(500),
        qty: z.number().min(0).max(1e9),
        unit_price: z.number().min(0).max(1e12),
      })
    )
    .max(200),
  tax_rate: z.number().min(0).max(100),
  notes: z.string().max(5000).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(),
});

export type InvoiceInputType = z.infer<typeof InvoiceInput>;
export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

async function nextNumber(workspaceId: string, kind: "invoice" | "quote") {
  const prefix = kind === "invoice" ? "INV-" : "QUO-";
  const supabase = await supabaseServer();
  const { data } = await supabase.from("invoices").select("number").eq("workspace_id", workspaceId).eq("kind", kind);
  let max = 0;
  for (const r of data ?? []) {
    const n = parseInt(String(r.number).replace(prefix, ""), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export async function saveInvoice(raw: InvoiceInputType): Promise<ActionResult> {
  const { workspace } = await requireWorkspace();
  const parsed = InvoiceInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const v = parsed.data;
  const supabase = await supabaseServer();
  const fields = {
    kind: v.kind,
    client_name: v.client_name,
    client_email: v.client_email || null,
    items: v.items.filter((i) => i.description.trim() || i.unit_price),
    tax_rate: v.tax_rate,
    notes: v.notes?.trim() || null,
    due_date: v.due_date || null,
  };

  if (v.id) {
    const { data: existing } = await supabase.from("invoices").select("kind, number").eq("id", v.id).eq("workspace_id", workspace.id).maybeSingle();
    if (!existing) return { ok: false, error: "Not found" };
    const update: Record<string, unknown> = { ...fields };
    if (existing.kind !== v.kind) update.number = await nextNumber(workspace.id, v.kind);
    const { error } = await supabase.from("invoices").update(update).eq("id", v.id).eq("workspace_id", workspace.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: v.id };
  }

  // Retry a few times in case two creates race for the same number.
  for (let attempt = 0; attempt < 3; attempt++) {
    const number = await nextNumber(workspace.id, v.kind);
    const { data, error } = await supabase
      .from("invoices")
      .insert({ ...fields, workspace_id: workspace.id, number, status: "draft" })
      .select("id, number")
      .single();
    if (error || !data) {
      if (attempt === 2) return { ok: false, error: error?.message ?? "Could not create" };
      continue;
    }
    const totals = calcTotals(fields.items as LineItem[], v.tax_rate);
    await emit(workspace.id, "invoice.created", {
      invoice_id: data.id,
      number: data.number,
      kind: v.kind,
      client_name: v.client_name,
      client_email: fields.client_email,
      total: totals.total,
      currency: workspace.currency,
    });
    return { ok: true, id: data.id };
  }
  return { ok: false, error: "Could not create" };
}

export async function sendInvoice(id: string, note: string): Promise<ActionResult> {
  const { workspace, email: userEmail } = await requireWorkspace();
  const supabase = await supabaseServer();
  const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).eq("workspace_id", workspace.id).maybeSingle();
  if (!inv) return { ok: false, error: "Not found" };
  if (!inv.client_email) return { ok: false, error: "Add a client email before sending" };

  const items = (inv.items ?? []) as LineItem[];
  const t = calcTotals(items, Number(inv.tax_rate));
  const cur = workspace.currency;
  const label = inv.kind === "quote" ? "Quote" : "Invoice";
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${escapeHtml(i.description)}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">${escapeHtml(i.qty)}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">${escapeHtml(money(i.unit_price, cur))}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">${escapeHtml(money(i.qty * i.unit_price, cur))}</td></tr>`
    )
    .join("");
  const html = `<div style="font-family:Arial,sans-serif;color:#111;max-width:600px;margin:0 auto">
<h2 style="margin:0 0 4px">${escapeHtml(workspace.name)}</h2>
<p style="margin:0 0 16px;color:#666">${label} ${escapeHtml(inv.number)}${inv.due_date ? ` &middot; Due ${escapeHtml(fmtDate(inv.due_date))}` : ""}</p>
${note.trim() ? `<p style="white-space:pre-wrap">${escapeHtml(note.trim())}</p>` : ""}
<p>Hi ${escapeHtml(inv.client_name)},</p>
<table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr><th align="left">Description</th><th align="right">Qty</th><th align="right">Price</th><th align="right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<p style="text-align:right;margin:12px 0 0">Subtotal: ${escapeHtml(money(t.subtotal, cur))}<br/>Tax (${escapeHtml(inv.tax_rate)}%): ${escapeHtml(money(t.tax, cur))}<br/><strong>Total: ${escapeHtml(money(t.total, cur))}</strong></p>
${inv.notes ? `<p style="color:#666;white-space:pre-wrap">${escapeHtml(inv.notes)}</p>` : ""}
${workspace.company_details ? `<p style="color:#888;font-size:12px;white-space:pre-wrap">${escapeHtml(workspace.company_details)}</p>` : ""}
</div>`;

  try {
    await sendEmail({ to: inv.client_email, subject: `${label} ${inv.number} from ${workspace.name}`, html, replyTo: userEmail || undefined });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Email failed" };
  }
  const sent_at = new Date().toISOString();
  const { error } = await supabase.from("invoices").update({ status: "sent", sent_at }).eq("id", id).eq("workspace_id", workspace.id);
  if (error) return { ok: false, error: error.message };
  await emit(workspace.id, "invoice.sent", {
    invoice_id: id, number: inv.number, kind: inv.kind, client_name: inv.client_name,
    client_email: inv.client_email, total: t.total, currency: cur,
  });
  return { ok: true, id };
}

export async function markPaid(id: string): Promise<ActionResult> {
  const { workspace } = await requireWorkspace();
  const supabase = await supabaseServer();
  const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).eq("workspace_id", workspace.id).maybeSingle();
  if (!inv) return { ok: false, error: "Not found" };
  const { error } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspace.id);
  if (error) return { ok: false, error: error.message };
  const t = calcTotals((inv.items ?? []) as LineItem[], Number(inv.tax_rate));
  await emit(workspace.id, "invoice.paid", {
    invoice_id: id, number: inv.number, kind: inv.kind, client_name: inv.client_name,
    client_email: inv.client_email, total: t.total, currency: workspace.currency,
  });
  return { ok: true, id };
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  const { workspace } = await requireWorkspace();
  const supabase = await supabaseServer();
  const { error } = await supabase.from("invoices").delete().eq("id", id).eq("workspace_id", workspace.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, id };
}
