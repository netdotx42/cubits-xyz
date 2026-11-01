import { authenticate, json } from "@/lib/agents/keys";
import { supabaseAdmin } from "@/lib/supabase/server";
import { agentBody } from "@/lib/agents/schema";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = agentBody.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const { data } = await supabaseAdmin()
    .from("agents").update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id).eq("workspace_id", auth.workspaceId).eq("archived", false)
    .select("id, name, instructions, tools, created_at, updated_at").maybeSingle();
  return data ? json(data) : json({ error: "Agent not found." }, 404);
}
