import { supabaseAdmin } from "@/lib/supabase/server";

// Fallback used only if the database limiter is unavailable (for example before audit-fixes.sql is run).
const local = new Map<string, { n: number; reset: number }>();

function localHit(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now();
  const b = local.get(key);
  if (!b || b.reset < now) {
    local.set(key, { n: 1, reset: now + windowSeconds * 1000 });
    if (local.size > 5000) for (const [k, v] of local) if (v.reset < now) local.delete(k);
    return true;
  }
  return ++b.n <= limit;
}

/**
 * Counts one call against `key` and returns true while it is within `limit` per window.
 * Shared across server instances through the rate_limit_hit() SQL function.
 */
export async function allow(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin().rpc("rate_limit_hit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    return data === true;
  } catch (e) {
    console.warn("shared rate limiter unavailable, using per-instance fallback", e instanceof Error ? e.message : e);
    return localHit(key, limit, windowSeconds);
  }
}

/** Daily cap on emails a workspace can send through automations and agents (M3). */
export const WORKSPACE_DAILY_EMAILS = 200;

export async function allowWorkspaceEmail(workspaceId: string, recipients: number): Promise<boolean> {
  // One counter step per recipient so a 10-recipient email costs 10.
  for (let i = 0; i < Math.max(1, recipients); i++) {
    if (!(await allow(`email:${workspaceId}`, WORKSPACE_DAILY_EMAILS, 86_400))) return false;
  }
  return true;
}

/** Best-effort client IP. On Vercel, x-real-ip is set by the platform and cannot be spoofed by the client. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-real-ip") ??
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ??
    "unknown"
  ) || "unknown";
}
