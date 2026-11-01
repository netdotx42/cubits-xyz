/** Only allow same-site relative paths. Blocks //host, /\host and absolute URLs. */
export function safeNext(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\r\n]/.test(value)) return fallback;
  return value;
}

/** Invite tokens are hex; reject anything else so it cannot alter the path. */
export function safeInvite(value: string | null | undefined): string | null {
  return value && /^[A-Za-z0-9_-]{8,64}$/.test(value) ? value : null;
}

export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("email not confirmed")) return "Confirm your email first. Check your inbox for the link we sent when you signed up.";
  if (m.includes("invalid login")) return "Wrong email or password.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Wait a minute and try again.";
  return message;
}
