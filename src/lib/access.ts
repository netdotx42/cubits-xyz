import { supabaseAdmin } from "@/lib/supabase/server";

export type PlanStatus = "none" | "trialing" | "active" | "past_due" | "canceled";

/** Trialing or active. The single definition of "this plan is on". */
export const isOn = (status: string | null | undefined) => status === "trialing" || status === "active";

/** Server-side plan lookup for code that runs without a signed-in user (public forms, cron, engine). */
export async function workspacePlan(workspaceId: string): Promise<{ name: string; cubits: boolean; agents: boolean } | null> {
  const { data } = await supabaseAdmin()
    .from("workspaces")
    .select("name, plan_status, agents_status")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!data) return null;
  return { name: data.name as string, cubits: isOn(data.plan_status as string), agents: isOn(data.agents_status as string) };
}
