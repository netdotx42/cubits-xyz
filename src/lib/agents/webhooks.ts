import { createHmac } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { safePost, safeUrl } from "@/lib/net/safe-fetch";

export { safeUrl };

/** Fire signed webhooks for an event. Never throws. */
export async function dispatch(workspaceId: string, event: "run.completed" | "run.needs_approval", data: unknown) {
  try {
    const { data: hooks } = await supabaseAdmin().from("webhooks").select("url, secret, events").eq("workspace_id", workspaceId);
    const body = JSON.stringify({ event, created_at: new Date().toISOString(), data });
    await Promise.all(
      (hooks ?? [])
        .filter((h) => (h.events as string[]).includes(event) && safeUrl(h.url))
        .map((h) =>
          safePost(h.url, null, {
            rawBody: body,
            timeoutMs: 5000,
            headers: {
              "x-cubits-event": event,
              "x-cubits-signature": createHmac("sha256", h.secret).update(body).digest("hex"),
            },
          }).catch(() => undefined)
        )
    );
  } catch (e) {
    console.error("webhook dispatch failed", e);
  }
}
