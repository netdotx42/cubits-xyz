import { Resend } from "resend";

let client: Resend | null = null;

/** Send a plain transactional email via Resend. No-ops (logs) if RESEND_API_KEY is unset. */
export async function sendEmail(opts: { to: string | string[]; subject: string; html: string; replyTo?: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set; skipping email:", opts.subject);
    return { skipped: true as const };
  }
  client ??= new Resend(process.env.RESEND_API_KEY);
  const { error } = await client.emails.send({
    from: process.env.EMAIL_FROM ?? "Cubits <onboarding@resend.dev>",
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    replyTo: opts.replyTo,
  });
  if (error) throw new Error(error.message);
  return { skipped: false as const };
}
