import { z } from "zod";
import { authenticate, json } from "@/lib/agents/keys";
import { RunError, resumeRun } from "@/lib/agents/runner";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = z.object({ approve: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Body must be { approve: boolean }." }, 400);
  try {
    const { run } = await resumeRun({ workspaceId: auth.workspaceId, runId: id, approve: parsed.data.approve });
    return json(run);
  } catch (e) {
    if (e instanceof RunError) return json({ error: e.message }, e.status);
    return json({ error: "Could not resume run." }, 500);
  }
}
