import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const body = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(5).max(4000),
  website: z.string().optional(), // honeypot: real visitors leave it empty
});

// Best-effort per-instance limiter (resets on cold start). The DB flood guard below backs it up.
const hits = new Map<string, { n: number; reset: number }>();
const PER_HOUR = 5;

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) hits.set(ip, { n: 1, reset: now + 3_600_000 });
  else if (++h.n > PER_HOUR) return Response.json({ error: "Too many messages. Try again later." }, { status: 429 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check your name, email and message." }, { status: 400 });
  if (parsed.data.website) return Response.json({ ok: true }); // bot: pretend success

  const db = supabaseAdmin();
  const since = new Date(now - 3_600_000).toISOString();
  const { count } = await db.from("contact_messages").select("id", { count: "exact", head: true }).gte("created_at", since);
  if ((count ?? 0) >= 100) return Response.json({ error: "Busy right now. Try again later." }, { status: 429 });

  const { name, email, message } = parsed.data;
  const { error } = await db.from("contact_messages").insert({ name, email, message });
  if (error) {
    console.error("contact insert failed", error.message);
    return Response.json({ error: "Could not send. Try again." }, { status: 500 });
  }
  return Response.json({ ok: true }, { status: 201 });
}
