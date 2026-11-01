import { createHash, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runScheduled } from "@/lib/automations/scheduled";
import { sweepStaleRuns } from "@/lib/agents/runner";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Constant-time comparison of the bearer token (hashing first makes the lengths equal). */
function authorized(header: string | null, secret: string): boolean {
  const a = createHash("sha256").update(header ?? "").digest();
  const b = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authorized(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const kind = req.nextUrl.searchParams.get("kind");
  if (kind !== "daily" && kind !== "weekly") {
    return NextResponse.json({ error: "kind must be daily or weekly" }, { status: 400 });
  }
  try {
    const result = await runScheduled(kind);
    // Housekeeping: fail agent runs left hanging by a killed function, drop old rate-limit windows.
    const stale = await sweepStaleRuns();
    await supabaseAdmin().from("rate_limits").delete().lt("window_start", new Date(Date.now() - 2 * 86_400_000).toISOString());
    return NextResponse.json({ ok: true, kind, ...result, stale_runs: stale });
  } catch (e) {
    console.error("cron automations failed", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
