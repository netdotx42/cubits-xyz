import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

/** New key. The plaintext is shown once and only its hash is stored. */
export function generateKey() {
  const key = `cbk_${randomBytes(24).toString("hex")}`;
  return { key, prefix: key.slice(0, 11), hash: hashKey(key) };
}

// Best-effort per-instance limiter (resets on cold start). Real limits need Redis/KV later.
const buckets = new Map<string, { n: number; reset: number }>();
const LIMIT_PER_MIN = 60;

export type ApiAuth = { workspaceId: string; keyId: string };

/** Authenticate a /v1 request. Returns the workspace or a Response to send back. */
export async function authenticate(req: Request): Promise<ApiAuth | Response> {
  const m = /^Bearer\s+(cbk_[a-f0-9]{48})$/.exec(req.headers.get("authorization") ?? "");
  if (!m) return json({ error: "Missing or invalid API key. Send 'Authorization: Bearer cbk_...'." }, 401);

  const admin = supabaseAdmin();
  const { data: row } = await admin
    .from("api_keys")
    .select("id, workspace_id, revoked_at")
    .eq("key_hash", hashKey(m[1]))
    .maybeSingle();
  if (!row || row.revoked_at) return json({ error: "Invalid API key." }, 401);

  const now = Date.now();
  const b = buckets.get(row.id);
  if (!b || b.reset < now) buckets.set(row.id, { n: 1, reset: now + 60_000 });
  else if (++b.n > LIMIT_PER_MIN) return json({ error: "Rate limit exceeded (60 requests/minute)." }, 429);

  const { data: ws } = await admin.from("workspaces").select("agents_status").eq("id", row.workspace_id).single();
  if (!ws || !["trialing", "active"].includes(ws.agents_status)) {
    return json({ error: "Agents plan is not active for this workspace." }, 402);
  }
  void admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", row.id).then(() => {});
  return { workspaceId: row.workspace_id, keyId: row.id };
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
