import { isIP } from "node:net";
import { sendEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase/server";
import { escapeHtml, render, lookup } from "./template";
import {
  CONFIG_SCHEMAS,
  type ActionContext,
  type ActionType,
  type EmailConfig,
  type SlackConfig,
  type WebhookConfig,
} from "./types";

function isPrivateIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

/** Throws unless the URL is a public-looking https URL. */
export function assertSafeUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (u.protocol !== "https:") throw new Error("Only https URLs are allowed");
  if (u.username || u.password) throw new Error("Credentials in URL are not allowed");
  let host = u.hostname.toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Host not allowed");
  }
  const kind = isIP(host);
  if (kind === 4 && isPrivateIPv4(host)) throw new Error("Private IP not allowed");
  if (kind === 6) {
    const mapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (
      host === "::" ||
      host === "::1" ||
      host.startsWith("fc") ||
      host.startsWith("fd") ||
      host.startsWith("fe8") ||
      host.startsWith("fe9") ||
      host.startsWith("fea") ||
      host.startsWith("feb") ||
      host.startsWith("::ffff:") ||
      (mapped && isPrivateIPv4(mapped[1]))
    ) {
      throw new Error("Private IP not allowed");
    }
  }
  return u;
}

async function postJson(url: string, body: unknown): Promise<void> {
  const u = assertSafeUrl(url);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(u.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      redirect: "manual",
      signal: ctrl.signal,
    });
    if (res.status >= 300) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error("Request timed out after 10s");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function summaryLines(payload: Record<string, unknown>): string {
  return Object.entries(payload)
    .filter(([, v]) => v === null || typeof v !== "object")
    .map(([k, v]) => `${k}: ${String(v ?? "")}`)
    .join("\n");
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
  const body = render(cfg.body, ctx.payload, { escape: true }).replace(/\n/g, "<br>");
  await sendEmail({ to, subject, html: `<div style="font-family:sans-serif">${body}</div>` });
}

async function runSlack(cfg: SlackConfig, ctx: ActionContext) {
  const tpl = cfg.message ?? `Cubits: ${ctx.event}\n${summaryLines(ctx.payload)}`;
  await postJson(cfg.webhook_url, { text: render(tpl, ctx.payload).slice(0, 3000) });
}

async function runWebhook(cfg: WebhookConfig, ctx: ActionContext) {
  await postJson(cfg.url, {
    event: ctx.event,
    payload: ctx.payload,
    workspace_id: ctx.workspaceId,
    timestamp: new Date().toISOString(),
  });
}

async function runCreateInvoiceDraft(ctx: ActionContext) {
  if (ctx.event !== "form.submitted") throw new Error("create_invoice_draft requires a form.submitted trigger");
  const clientName = (lookup(ctx.payload, "data.name") || lookup(ctx.payload, "data.company")).trim();
  if (!clientName) throw new Error("Submission has no name or company");
  const clientEmail = lookup(ctx.payload, "data.email").trim() || null;

  const db = supabaseAdmin();
  const { data, error } = await db.from("invoices").select("number").eq("workspace_id", ctx.workspaceId);
  if (error) throw new Error(error.message);
  let max = 0;
  for (const r of data ?? []) {
    const m = /^INV-(\d+)$/.exec(String((r as { number: string }).number));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const number = `INV-${String(max + 1).padStart(4, "0")}`;
  const { error: insErr } = await db.from("invoices").insert({
    workspace_id: ctx.workspaceId,
    kind: "invoice",
    number,
    client_name: clientName.slice(0, 200),
    client_email: clientEmail,
    items: [],
    status: "draft",
  });
  if (insErr) throw new Error(insErr.message);
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

export { escapeHtml };
