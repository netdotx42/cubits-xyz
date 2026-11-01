import { NextResponse, type NextRequest } from "next/server";
import { runScheduled } from "@/lib/automations/scheduled";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const kind = req.nextUrl.searchParams.get("kind");
  if (kind !== "daily" && kind !== "weekly") {
    return NextResponse.json({ error: "kind must be daily or weekly" }, { status: 400 });
  }
  try {
    const result = await runScheduled(kind);
    return NextResponse.json({ ok: true, kind, ...result });
  } catch (e) {
    console.error("cron automations failed", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
