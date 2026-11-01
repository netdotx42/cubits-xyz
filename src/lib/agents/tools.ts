import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/components/cubits/util";

export type ToolName = "send_email" | "create_invoice_draft" | "read_form_submissions";

export const TOOL_CATALOG: Record<ToolName, { label: string; sensitive: boolean; description: string; schema: object }> = {
  send_email: {
    label: "Send email",
    sensitive: true,
    description: "Send an email. A human must approve before it is sent.",
    schema: {
      type: "object",
      properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } },
      required: ["to", "subject", "body"],
    },
  },
  create_invoice_draft: {
    label: "Create invoice draft",
    sensitive: false,
    description: "Create a draft invoice (never sent automatically).",
    schema: {
      type: "object",
      properties: {
        client_name: { type: "string" },
        client_email: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: { description: { type: "string" }, qty: { type: "number" }, unit_price: { type: "number" } },
            required: ["description", "qty", "unit_price"],
          },
        },
        notes: { type: "string" },
      },
      required: ["client_name", "items"],
    },
  },
  read_form_submissions: {
    label: "Read form submissions",
    sensitive: false,
    description: "Read the latest lead submissions (up to 20), optionally for one form.",
    schema: { type: "object", properties: { form_id: { type: "string" }, limit: { type: "number" } } },
  },
};

export const isToolName = (s: string): s is ToolName => s in TOOL_CATALOG;

export function toolDefs(names: string[]) {
  return names.filter(isToolName).map((n) => ({
    name: n,
    description: TOOL_CATALOG[n].description,
    input_schema: TOOL_CATALOG[n].schema,
  }));
}

type Obj = Record<string, unknown>;
const str = (v: unknown, max = 5000) => String(v ?? "").slice(0, max);

/** Execute a tool. Always scoped to the workspace; throws on bad input. */
export async function runTool(workspaceId: string, name: ToolName, input: Obj): Promise<unknown> {
  const db = supabaseAdmin();

  if (name === "send_email") {
    const to = str(input.to, 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("Invalid recipient email.");
    const { data: ws } = await db.from("workspaces").select("name").eq("id", workspaceId).single();
    const html = `<div style="white-space:pre-wrap;font-family:sans-serif">${escapeHtml(str(input.body))}</div>`;
    const r = await sendEmail({ to, subject: str(input.subject, 200), html });
    return { sent: !r.skipped, note: r.skipped ? "Email provider not configured; nothing sent." : `Sent as ${ws?.name ?? "workspace"}.` };
  }

  if (name === "create_invoice_draft") {
    const items = (Array.isArray(input.items) ? input.items : []).slice(0, 50).map((i) => {
      const o = i as Obj;
      return { description: str(o.description, 300), qty: Number(o.qty) || 1, unit_price: Number(o.unit_price) || 0 };
    });
    if (!items.length) throw new Error("At least one line item is required.");
    const { count } = await db.from("invoices").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);
    const number = `INV-${String((count ?? 0) + 1).padStart(4, "0")}`;
    const { data, error } = await db
      .from("invoices")
      .insert({
        workspace_id: workspaceId, kind: "invoice", number, status: "draft", items,
        client_name: str(input.client_name, 200), client_email: input.client_email ? str(input.client_email, 254) : null,
        notes: input.notes ? str(input.notes, 2000) : null,
      })
      .select("id, number")
      .single();
    if (error) throw new Error(error.message);
    return { invoice_id: data.id, number: data.number, status: "draft" };
  }

  // read_form_submissions
  let q = db.from("submissions").select("form_id, data, created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
  if (input.form_id) q = q.eq("form_id", str(input.form_id, 64));
  const { data, error } = await q.limit(Math.min(20, Number(input.limit) || 20));
  if (error) throw new Error(error.message);
  return data;
}
