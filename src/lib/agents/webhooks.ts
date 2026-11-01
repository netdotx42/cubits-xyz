import { createHmac } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Block obvious internal targets (host-only check, same as automations). */
export function safeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h.includes(":")) return null;
    if (/^(10|127|0)\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return null;
    return u;
  } catch {
    return null;
  }
}

/** Fire signed webhooks for an event. Never throws. */
export async function dispatch(workspaceId: string, event: "run.completed" | "run.needs_approval", data: unknown) {
  try {
    const { data: hooks } = await supabaseAdmin().from("webhooks").select("url, secret, events").eq("workspace_id", workspaceId);
    const body = JSON.stringify({ event, created_at: new Date().toISOString(), data });
    await Promise.all(
      (hooks ?? [])
        .filter((h) => (h.events as string[]).includes(event) && safeUrl(h.url))
        .map((h) =>
          fetch(h.url, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-cubits-event": event,
              "x-cubits-signature": createHmac("sha256", h.secret).update(body).digest("hex"),
            },
            body,
            redirect: "manual",
            signal: AbortSignal.timeout(5000),
          }).catch(() => undefined)
        )
    );
  } catch (e) {
    console.error("webhook dispatch failed", e);
  }
}
