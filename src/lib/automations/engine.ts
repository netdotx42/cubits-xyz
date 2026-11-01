import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { workspacePlan } from "@/lib/access";
import { TransientError } from "@/lib/net/safe-fetch";
import { runAction } from "./actions";
import { isAction, MONTHLY_RUN_CAP, type AutomationRow } from "./types";

function monthStartIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

/** Runs the given automations for one workspace, logging each run. Never throws. */
export async function executeAutomations(
  workspaceId: string,
  automations: AutomationRow[],
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    if (automations.length === 0) return;
    // Automations are part of the Cubits plan: a lapsed workspace runs nothing.
    const plan = await workspacePlan(workspaceId);
    if (!plan?.cubits) return;

    const db = supabaseAdmin();
    const { count } = await db
      .from("automation_runs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", monthStartIso());
    let used = count ?? 0;

    for (const a of automations) {
      if (used >= MONTHLY_RUN_CAP) {
        console.warn("automation run cap reached", workspaceId);
        return;
      }
      used++;
      let error: string | null = null;
      try {
        if (!isAction(a.action)) throw new Error(`Unknown action: ${a.action}`);
        const ctx = { workspaceId, workspaceName: plan.name, event, payload, deliveryId: randomUUID() };
        try {
          await runAction(a.action, a.config, ctx);
        } catch (first) {
          // Retry once, and only when the failure is clearly transient (network, timeout, 429, 5xx).
          // Anything else may already have had an effect, so a retry could deliver twice.
          if (!(first instanceof TransientError)) throw first;
          await runAction(a.action, a.config, ctx);
        }
      } catch (e) {
        error = (e instanceof Error ? e.message : String(e)).slice(0, 1000);
      }
      try {
        await db.from("automation_runs").insert({
          automation_id: a.id,
          workspace_id: workspaceId,
          status: error ? "error" : "success",
          error,
          payload,
        });
      } catch (e) {
        console.error("failed to log automation run", e);
      }
    }
  } catch (e) {
    console.error("executeAutomations failed", e);
  }
}

export async function runAutomations(
  workspaceId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("automations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("trigger", event)
      .eq("enabled", true);
    if (error) throw new Error(error.message);
    await executeAutomations(workspaceId, (data ?? []) as AutomationRow[], event, payload);
  } catch (e) {
    console.error("runAutomations failed", event, e);
  }
}
