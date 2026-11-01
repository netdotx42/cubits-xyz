import { authenticate, json } from "@/lib/agents/keys";
import { supabaseAdmin } from "@/lib/supabase/server";
import { publicRun } from "@/lib/agents/runner";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const db = supabaseAdmin();
  const { data: run } = await db.from("runs").select("*").eq("id", id).eq("workspace_id", auth.workspaceId).maybeSingle();
  if (!run) return json({ error: "Run not found." }, 404);
  const { data: events } = await db.from("run_events").select("type, data, created_at").eq("run_id", id).order("id");
  return json({ ...publicRun(run), events });
}
