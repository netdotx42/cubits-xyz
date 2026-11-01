import { sendEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase/server";
import { assertSafeUrl, safePost } from "@/lib/net/safe-fetch";
import { allowWorkspaceEmail } from "@/lib/rate-limit";
import { insertNumbered } from "@/lib/invoices/number";
import { escapeHtml } from "@/components/cubits/util";
import { render, lookup } from "./template";
import {
  CONFIG_SCHEMAS,
  type ActionContext,
  type ActionType,
  type EmailConfig,
  type SlackConfig,
  type WebhookConfig,
} from "./types";

function summaryLines(payload: Record<string, unknown>): string {
  return Object.entries(payload)
    .filter(([, v]) => v === null || typeof v !== "object")
    .map(([k, v]) => `${k}: ${String(v ?? "")}`)
    .join("\n");
}

export { assertSafeUrl };

function footer(ctx: ActionContext) {
  return `<p style="margin-top:24px;color:#888;font-size:12px">Sent by ${escapeHtml(ctx.workspaceName ?? "a Cubits workspace")} using Cubits automations.</p>`;
}

async function runEmail(cfg: EmailConfig, ctx: ActionContext) {
  const to = render(cfg.to, ctx.payload)
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (to.length === 0 || to.length > 10 || !to.every((a) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(a))) {
    throw new Error("Invalid recipient address");
  }
  const subject = render(cfg.subject, ctx.payload).replace(/[\r\n]+/g, " ").slice(0, 300);
  if (!(await allowWorkspaceEmail(ctx.workspaceId, to.length))) throw new Error("Daily email limit reached for this workspace");
  const body = render(cfg.body, ctx.payload, { escape: true }).replace(/\n/g, "<br>");
  await sendEmail({ to, subject, html: `<div style="font-family:sans-serif">${body}${footer(ctx)}</div>`, tenant: true });
}

async function runSlack(cfg: SlackConfig, ctx: ActionContext) {
  const tpl = cfg.message ?? `Cubits: ${ctx.event}\n${summaryLines(ctx.payload)}`;
  await safePost(cfg.webhook_url, { text: render(tpl, ctx.payload).slice(0, 3000) });
}

async function runWebhook(cfg: WebhookConfig, ctx: ActionContext) {
  await safePost(
    cfg.url,
    {
      event: ctx.event,
      payload: ctx.payload,
      workspace_id: ctx.workspaceId,
      delivery_id: ctx.deliveryId,
      timestamp: new Date().toISOString(),
    },
    // Lets receivers drop a duplicate if a retry follows a timeout that actually got through.
    { headers: ctx.deliveryId ? { "x-cubits-delivery": ctx.deliveryId, "idempotency-key": ctx.deliveryId } : {} }
  );
}

async function runCreateInvoiceDraft(ctx: ActionContext) {
  if (ctx.event !== "form.submitted") throw new Error("create_invoice_draft requires a form.submitted trigger");
  const clientName = (lookup(ctx.payload, "data.name") || lookup(ctx.payload, "data.company")).trim();
  if (!clientName) throw new Error("Submission has no name or company");
  const clientEmail = lookup(ctx.payload, "data.email").trim() || null;

  await insertNumbered(supabaseAdmin(), {
    workspace_id: ctx.workspaceId,
    kind: "invoice",
    client_name: clientName.slice(0, 200),
    client_email: clientEmail,
    items: [],
    status: "draft",
  });
}

/** Validates config then runs the action. Throws on failure. */
export async function runAction(action: ActionType, rawConfig: unknown, ctx: ActionContext): Promise<void> {
  const parsed = CONFIG_SCHEMAS[action].safeParse(rawConfig ?? {});
  if (!parsed.success) throw new Error("Invalid config: " + parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; "));
  switch (action) {
    case "email":
      return runEmail(parsed.data as EmailConfig, ctx);
    case "slack":
      return runSlack(parsed.data as SlackConfig, ctx);
    case "webhook":
      return runWebhook(parsed.data as WebhookConfig, ctx);
    case "create_invoice_draft":
      return runCreateInvoiceDraft(ctx);
  }
}

