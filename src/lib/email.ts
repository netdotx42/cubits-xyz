import { Resend } from "resend";

let client: Resend | null = null;

/**
 * Send a plain transactional email via Resend. No-ops (logs) if RESEND_API_KEY is unset.
 * `tenant: true` marks mail whose content a customer wrote (automations, agents). It goes out from
 * EMAIL_FROM_TENANT when set, so abuse there cannot hurt the reputation of sign-in and billing mail.
 */
export async function sendEmail(opts: { to: string | string[]; subject: string; html: string; replyTo?: string; tenant?: boolean }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set; skipping email:", opts.subject);
    return { skipped: true as const };
  }
  client ??= new Resend(process.env.RESEND_API_KEY);
  const { error } = await client.emails.send({
    from: (opts.tenant && process.env.EMAIL_FROM_TENANT) || process.env.EMAIL_FROM || "Cubits <onboarding@resend.dev>",
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    replyTo: opts.replyTo,
  });
  if (error) throw new Error(error.message);
  return { skipped: false as const };
}
