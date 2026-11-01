import Link from "next/link";
import { requireWorkspace } from "@/lib/workspace";
import { supabaseServer } from "@/lib/supabase/server";
import RuleRow, { type Rule } from "@/components/automations/RuleRow";
import { MONTHLY_RUN_CAP } from "@/lib/automations/types";

type Run = { id: string; automation_id: string; status: string; error: string | null; created_at: string };

export default async function AutomationsPage() {
  const { workspace } = await requireWorkspace();
  const supabase = await supabaseServer();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [{ data: autos }, { data: runs }, { count }] = await Promise.all([
    supabase.from("automations").select("id, name, trigger, action, enabled").eq("workspace_id", workspace.id).order("created_at", { ascending: false }),
    supabase.from("automation_runs").select("id, automation_id, status, error, created_at").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(200),
    supabase.from("automation_runs").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id).gte("created_at", monthStart),
  ]);

  const runList = (runs ?? []) as Run[];
  const lastByAuto = new Map<string, Run>();
  for (const r of runList) if (!lastByAuto.has(r.automation_id)) lastByAuto.set(r.automation_id, r);
  const names = new Map((autos ?? []).map((a) => [a.id as string, a.name as string]));
  const rules: Rule[] = (autos ?? []).map((a) => ({
    id: a.id as string,
    name: a.name as string,
    trigger: a.trigger as string,
    action: a.action as string,
    enabled: a.enabled as boolean,
    last: lastByAuto.get(a.id as string) ?? null,
  }));
  const used = count ?? 0;
  const pct = Math.min(100, Math.round((used / MONTHLY_RUN_CAP) * 100));

  return (
    <main className="bg-black text-paper min-h-screen px-4 py-8 max-w-3xl mx-auto space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-mute">Cubit</p>
          <h1 className="text-2xl font-semibold mt-1">Automations</h1>
        </div>
        <Link href="/app/automations/new" className="min-h-[44px] inline-flex items-center rounded-full bg-paper text-black px-5 font-medium shrink-0">
          New
        </Link>
      </header>

      <section aria-label="Usage">
        <p className="font-mono text-[11px] uppercase tracking-widest text-mute">
          {used.toLocaleString("en-US")} of {MONTHLY_RUN_CAP.toLocaleString("en-US")} runs this month
        </p>
        <div className="mt-2 h-1 w-full bg-line rounded-full overflow-hidden">
          <div className="h-full bg-paper" style={{ width: `${pct}%` }} />
        </div>
      </section>

      <section aria-label="Rules">
        {rules.length === 0 ? (
          <p className="border border-line rounded-xl p-6 text-sm text-mute">No automations yet. Create one to react to forms and invoices.</p>
        ) : (
          <ul className="space-y-3">
            {rules.map((r) => (
              <RuleRow key={r.id} rule={r} />
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Recent runs">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-mute mb-3">Recent runs</h2>
        {runList.length === 0 ? (
          <p className="text-sm text-mute">No runs yet.</p>
        ) : (
          <ul className="border border-line rounded-xl divide-y divide-line">
            {runList.slice(0, 20).map((r) => (
              <li key={r.id} className="p-3 text-sm min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono text-[11px] uppercase tracking-widest border border-line rounded-full px-2 py-0.5">{r.status}</span>
                  <span className="break-words min-w-0">{names.get(r.automation_id) ?? "Deleted rule"}</span>
                  <span className="text-mute text-xs ml-auto">{new Date(r.created_at).toISOString().slice(0, 16).replace("T", " ")} UTC</span>
                </div>
                {r.error && <p className="mt-1 text-xs text-mute break-words">{r.error}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
