"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasAgentsAccess, requireWorkspace } from "@/lib/workspace";
import { supabaseAdmin } from "@/lib/supabase/server";
import { agentBody } from "@/lib/agents/schema";
import { generateKey } from "@/lib/agents/keys";
import { RunError, resumeRun, startRun } from "@/lib/agents/runner";

async function ctx() {
  const c = await requireWorkspace({ allowUnpaid: true });
  if (!hasAgentsAccess(c.workspace)) throw new Error("Agents plan is not active.");
  return c;
}

function parseAgent(fd: FormData) {
  const parsed = agentBody.safeParse({
    name: fd.get("name"),
    instructions: fd.get("instructions") ?? "",
    tools: fd.getAll("tools").map(String),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid agent");
  return parsed.data;
}

export async function createAgent(fd: FormData) {
  const { workspace } = await ctx();
  const { data, error } = await supabaseAdmin().from("agents").insert({ ...parseAgent(fd), workspace_id: workspace.id }).select("id").single();
  if (error) throw new Error("Could not create agent.");
  redirect(`/app/agents/${data.id}`);
}

export async function updateAgent(id: string, fd: FormData) {
  const { workspace } = await ctx();
  await supabaseAdmin().from("agents").update({ ...parseAgent(fd), updated_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", workspace.id);
  revalidatePath(`/app/agents/${id}`);
}

export async function archiveAgent(id: string) {
  const { workspace } = await ctx();
  await supabaseAdmin().from("agents").update({ archived: true }).eq("id", id).eq("workspace_id", workspace.id);
  redirect("/app/agents");
}

export type RunResult = { ok: true; status: string; output?: string | null; error?: string | null; runId: string } | { ok: false; error: string };

export async function runAgent(agentId: string, input: string): Promise<RunResult> {
  const { workspace } = await ctx();
  try {
    const { run } = await startRun({ workspaceId: workspace.id, agentId, input, source: "ui" });
    const r = run as { id: string; status: string; output?: string | null; error?: string | null };
    revalidatePath("/app/agents");
    return { ok: true, status: r.status, output: r.output, error: r.error, runId: r.id };
  } catch (e) {
    return { ok: false, error: e instanceof RunError ? e.message : "Run failed." };
  }
}

export async function decideRun(runId: string, approve: boolean) {
  const { workspace, userId } = await ctx();
  try {
    await resumeRun({ workspaceId: workspace.id, runId, approve, decidedBy: `user:${userId}` });
  } catch (e) {
    if (!(e instanceof RunError)) throw e;
  }
  revalidatePath("/app/agents");
}

export async function createKey(name: string): Promise<{ ok: true; key: string } | { ok: false; error: string }> {
  const { workspace, role } = await ctx();
  if (role !== "owner") return { ok: false, error: "Only the owner can create API keys." };
  const label = name.trim().slice(0, 60) || "Default";
  const db = supabaseAdmin();
  const { count } = await db.from("api_keys").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id).is("revoked_at", null);
  if ((count ?? 0) >= 10) return { ok: false, error: "Key limit reached (10). Revoke one first." };
  const { key, prefix, hash } = generateKey();
  const { error } = await db.from("api_keys").insert({ workspace_id: workspace.id, name: label, prefix, key_hash: hash });
  if (error) return { ok: false, error: "Could not create key." };
  revalidatePath("/app/agents");
  return { ok: true, key };
}

export async function revokeKey(id: string) {
  const { workspace, role } = await ctx();
  if (role !== "owner") return;
  await supabaseAdmin().from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", workspace.id);
  revalidatePath("/app/agents");
}
