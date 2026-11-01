"use client";

import { useState } from "react";
import {
  ACTIONS,
  ACTION_LABELS,
  MERGE_FIELDS,
  TRIGGERS,
  TRIGGER_LABELS,
  type ActionType,
  type Trigger,
} from "@/lib/automations/types";

const label = "block font-mono text-[11px] uppercase tracking-widest text-mute mb-2";
const input =
  "w-full min-h-[44px] bg-black border border-line rounded-lg px-3 py-2 text-paper placeholder:text-mute/60 focus:outline-none focus:border-paper text-base";

export default function NewAutomationForm({
  action: formAction,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
}) {
  const [trigger, setTrigger] = useState<Trigger>("form.submitted");
  const [action, setAction] = useState<ActionType>("email");

  return (
    <form action={formAction} className="space-y-6">
      {error && (
        <p role="alert" className="border border-line rounded-lg px-3 py-3 text-sm text-paper">
          {error}
        </p>
      )}
      <div>
        <label className={label} htmlFor="name">Name</label>
        <input id="name" name="name" required maxLength={120} className={input} placeholder="Notify me of new leads" />
      </div>
      <div>
        <label className={label} htmlFor="trigger">When</label>
        <select id="trigger" name="trigger" value={trigger} onChange={(e) => setTrigger(e.target.value as Trigger)} className={input}>
          {TRIGGERS.map((t) => (
            <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>
          ))}
        </select>
        <p className="mt-2 text-xs text-mute break-words">
          <span className="font-mono uppercase tracking-widest text-[11px]">Merge fields </span>
          {MERGE_FIELDS[trigger].map((f) => `{{${f}}}`).join("  ")}
        </p>
      </div>
      <div>
        <label className={label} htmlFor="action">Then</label>
        <select id="action" name="action" value={action} onChange={(e) => setAction(e.target.value as ActionType)} className={input}>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{ACTION_LABELS[a]}</option>
          ))}
        </select>
      </div>

      {action === "email" && (
        <div className="space-y-4">
          <div>
            <label className={label} htmlFor="email_to">To</label>
            <input id="email_to" name="email_to" required className={input} placeholder="you@company.com or {{data.email}}" />
          </div>
          <div>
            <label className={label} htmlFor="email_subject">Subject</label>
            <input id="email_subject" name="email_subject" required className={input} placeholder="New submission: {{form_name}}" />
          </div>
          <div>
            <label className={label} htmlFor="email_body">Body</label>
            <textarea id="email_body" name="email_body" required rows={6} className={input} placeholder="Hi, {{data.name}} just got in touch." />
          </div>
        </div>
      )}
      {action === "slack" && (
        <div className="space-y-4">
          <div>
            <label className={label} htmlFor="slack_url">Slack webhook URL</label>
            <input id="slack_url" name="slack_url" type="url" required className={input} placeholder="https://hooks.slack.com/services/..." />
          </div>
          <div>
            <label className={label} htmlFor="slack_message">Message</label>
            <textarea id="slack_message" name="slack_message" rows={3} className={input} placeholder="New lead: {{data.name}}" />
          </div>
        </div>
      )}
      {action === "webhook" && (
        <div>
          <label className={label} htmlFor="webhook_url">Webhook URL</label>
          <input id="webhook_url" name="webhook_url" type="url" required className={input} placeholder="https://example.com/hook" />
          <p className="mt-2 text-xs text-mute">POSTs JSON: event, payload, workspace_id, timestamp. https only.</p>
        </div>
      )}
      {action === "create_invoice_draft" && (
        <p className="text-sm text-mute">
          Creates a draft invoice from the submission (client from name or company, email from the email field). Requires the form submitted trigger.
        </p>
      )}

      <button type="submit" className="min-h-[44px] rounded-full bg-paper text-black px-6 font-medium w-full sm:w-auto">
        Create automation
      </button>
    </form>
  );
}
