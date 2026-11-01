import { authenticate, json } from "@/lib/agents/keys";
import { usageThisPeriod } from "@/lib/agents/runner";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;
  const u = await usageThisPeriod(auth.workspaceId);
  return json({ runs_used: u.used, runs_included: u.limit, period_start: u.periodStart, period_end: u.periodEnd });
}
