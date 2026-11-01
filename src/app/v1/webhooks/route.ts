import { z } from "zod";
import { authenticate, json } from "@/lib/agents/keys";
import { supabaseAdmin } from "@/lib/supabase/server";
import { safeUrl } from "@/lib/agents/webhooks";

export const runtime = "nodejs";

const body = z.object({
  url: z.string().url().max(500),
  events: z.array(z.enum(["run.completed", "run.needs_approval"])).min(1).optional(),
});

/** Returns the signing secret once. Deliveries carry x-cubits-signature = HMAC-SHA256(body, secret). */
export async function POST(req: Request) {
  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !safeUrl(parsed.data.url)) return json({ error: "url must be a public https URL." }, 400);
  const { count } = await supabaseAdmin().from("webhooks").select("id", { count: "exact", head: true }).eq("workspace_id", auth.workspaceId);
  if ((count ?? 0) >= 10) return json({ error: "Webhook limit reached (10)." }, 400);
  const { data, error } = await supabaseAdmin()
    .from("webhooks").insert({ workspace_id: auth.workspaceId, url: parsed.data.url, ...(parsed.data.events ? { events: parsed.data.events } : {}) })
    .select("id, url, events, secret").single();
  if (error) return json({ error: "Could not create webhook." }, 500);
  return json(data, 201);
}
