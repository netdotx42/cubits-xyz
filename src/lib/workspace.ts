import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export type Workspace = {
  id: string;
  name: string;
  owner_id: string;
  logo_url: string | null;
  company_details: string | null;
  currency: string;
  plan_status: "none" | "trialing" | "active" | "past_due" | "canceled";
  trial_end: string | null;
  seats: number;
  agents_status: "none" | "trialing" | "active" | "past_due" | "canceled";
  agents_period_end: string | null;
};

export type WorkspaceContext = {
  userId: string;
  email: string;
  role: "owner" | "member";
  workspace: Workspace;
};

/** Access = trialing or active. */
export function hasAccess(ws: Pick<Workspace, "plan_status">) {
  return ws.plan_status === "trialing" || ws.plan_status === "active";
}

/**
 * Use at the top of any server component / route handler under /app.
 * Redirects to /login if signed out, /app/onboarding if the user has no workspace,
 * and /app/billing if the workspace has no active trial or subscription.
 * Pass { allowUnpaid: true } for the billing and onboarding pages themselves.
 */
export async function requireWorkspace(opts: { allowUnpaid?: boolean } = {}): Promise<WorkspaceContext> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("members")
    .select("role, workspaces(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const workspace = (membership?.workspaces as unknown as Workspace | null) ?? null;
  if (!membership || !workspace) redirect("/app/onboarding");
  if (!opts.allowUnpaid && !hasAccess(workspace)) redirect("/app/billing");

  return {
    userId: user.id,
    email: user.email ?? "",
    role: membership.role as "owner" | "member",
    workspace,
  };
}
