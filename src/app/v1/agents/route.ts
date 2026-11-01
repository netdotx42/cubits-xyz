import { authenticate, json } from "@/lib/agents/keys";
import { supabaseAdmin } from "@/lib/supabase/server";
import { agentBody } from "@/lib/agents/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;
  const { data } = await supabaseAdmin()
    .from("agents").select("id, name, instructions, tools, created_at, updated_at")
    .eq("workspace_id", auth.workspaceId).eq("archived", false).order("created_at", { ascending: false });
  return json({ data });
}

export async function POST(req: Request) {
  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;
  const parsed = agentBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const { data, error } = await supabaseAdmin()
    .from("agents").insert({ ...parsed.data, workspace_id: auth.workspaceId })
    .select("id, name, instructions, tools, created_at, updated_at").single();
  if (error) return json({ error: "Could not create agent." }, 500);
  return json(data, 201);
}
