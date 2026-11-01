import { z } from "zod";

export const TRIGGERS = [
  "form.submitted",
  "invoice.created",
  "invoice.sent",
  "invoice.paid",
  "schedule.daily",
  "schedule.weekly",
] as const;
export type Trigger = (typeof TRIGGERS)[number];

export const ACTIONS = ["email", "slack", "webhook", "create_invoice_draft"] as const;
export type ActionType = (typeof ACTIONS)[number];

export const TRIGGER_LABELS: Record<Trigger, string> = {
  "form.submitted": "Form submitted",
  "invoice.created": "Invoice created",
  "invoice.sent": "Invoice sent",
  "invoice.paid": "Invoice paid",
  "schedule.daily": "Every day (08:00 UTC)",
  "schedule.weekly": "Every Monday (08:00 UTC)",
};

export const ACTION_LABELS: Record<ActionType, string> = {
  email: "Send email",
  slack: "Post to Slack",
  webhook: "Call webhook",
  create_invoice_draft: "Create draft invoice",
};

export const MERGE_FIELDS: Record<Trigger, string[]> = {
  "form.submitted": ["form_name", "data.name", "data.email", "data.company", "data.<field>"],
  "invoice.created": ["number", "client_name", "client_email", "total", "currency", "kind"],
  "invoice.sent": ["number", "client_name", "client_email", "total", "currency", "kind"],
  "invoice.paid": ["number", "client_name", "client_email", "total", "currency", "kind"],
  "schedule.daily": ["period", "new_submissions", "invoices_created", "invoices_paid", "unpaid_total"],
  "schedule.weekly": ["period", "new_submissions", "invoices_created", "invoices_paid", "unpaid_total"],
};

export const emailConfig = z.object({
  to: z.string().min(3).max(500),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(10000),
});
export const slackConfig = z.object({
  webhook_url: z.string().url().max(1000),
  message: z.string().min(1).max(3000).optional(),
});
export const webhookConfig = z.object({
  url: z.string().url().max(1000),
});
export const createInvoiceDraftConfig = z.object({}).passthrough();

export const CONFIG_SCHEMAS = {
  email: emailConfig,
  slack: slackConfig,
  webhook: webhookConfig,
  create_invoice_draft: createInvoiceDraftConfig,
} as const;

export type EmailConfig = z.infer<typeof emailConfig>;
export type SlackConfig = z.infer<typeof slackConfig>;
export type WebhookConfig = z.infer<typeof webhookConfig>;

export type Payload = Record<string, unknown>;

export type AutomationRow = {
  id: string;
  workspace_id: string;
  name: string;
  trigger: string;
  action: string;
  config: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
};

export type ActionContext = {
  workspaceId: string;
  event: string;
  payload: Payload;
};

export const MONTHLY_RUN_CAP = 1000;

export function isTrigger(v: string): v is Trigger {
  return (TRIGGERS as readonly string[]).includes(v);
}
export function isAction(v: string): v is ActionType {
  return (ACTIONS as readonly string[]).includes(v);
}
