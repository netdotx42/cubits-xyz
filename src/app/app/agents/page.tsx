import Link from "next/link";
import { requireWorkspace } from "@/lib/workspace";
import { supabaseServer } from "@/lib/supabase/server";
import { usageThisPeriod } from "@/lib/agents/runner";
import { TOOL_CATALOG } from "@/lib/agents/tools";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/app/Card";
import { btnGhost, btnPrimary, fmtDate, inputCls, labelCls } from "@/components/cubits/util";
import { KeyPanel } from "./KeyPanel";
import { createAgent, decideRun } from "./actions";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const { workspace, role } = await requireWorkspace({ allowUnpaid: true });

  if (!["trialing", "active"].includes(workspace.agents_status)) {
    return (
      <>
        <PageHeader title="Agents" subtitle="AI agents you can run from the app or your own code." />
        <Card>
          <p className="font-mono text-xs uppercase tracking-widest">$499 / year</p>
          <ul className="mt-3 space-y-1 text-sm text-mute">
            <li>3,000 agent runs a year, 5 seats</li>
            <li>REST API with keys, webhooks and streaming</li>
            <li>Tools: send email (with approval), invoice drafts, read leads</li>
            <li>Spend caps on every run. 7-day free trial.</li>
          </ul>
          {role === "owner" ? (
            <form action="/api/stripe/agents-checkout" method="post" className="mt-5">
              <button className={btnPrimary}>Start 7-day free trial</button>
            </form>
          ) : (
            <p className="mt-5 text-sm text-mute">Ask the workspace owner to enable Agents.</p>
          )}
        </Card>
      </>
    );
  }

  const supabase = await supabaseServer();
  const [{ data: agents }, { data: pending }, { data: keys }, usage] = await Promise.all([
    supabase.from("agents").select("id, name, tools, created_at").eq("workspace_id", workspace.id).eq("archived", false).order("created_at", { ascending: false }),
    supabase.from("runs").select("id, agent_id, pending_action, created_at").eq("workspace_id", workspace.id).eq("status", "awaiting_approval").order("created_at"),
    supabase.from("api_keys").select("id, name, prefix, last_used_at").eq("workspace_id", workspace.id).is("revoked_at", null).order("created_at"),
    usageThisPeriod(workspace.id),
  ]);
  const names = new Map((agents ?? []).map((a) => [a.id, a.name]));
  const pct = Math.min(100, Math.round((usage.used / usage.limit) * 100));
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-domain";

  return (
    <>
      <PageHeader title="Agents" subtitle="AI agents you can run from the app or your own code." />

      <Card className="mb-6">
        <div className="flex items-end justify-between">
          <p className="font-mono text-[11px] uppercase tracking-widest text-mute">Runs this year</p>
          <p className="font-mono text-sm">{usage.used.toLocaleString()} / {usage.limit.toLocaleString()}</p>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-line"><div className="h-1.5 rounded-full bg-paper" style={{ width: `${pct}%` }} /></div>
      </Card>

      {(pending ?? []).length > 0 && (
        <section className="mb-8">
          <h2 className={labelCls}>Needs your approval</h2>
          <div className="space-y-3">
            {(pending ?? []).map((r) => {
              const a = r.pending_action as { tool: string; input: Record<string, unknown> };
              return (
                <Card key={r.id}>
                  <p className="text-sm"><span className="font-medium">{names.get(r.agent_id) ?? "Agent"}</span> wants to <span className="font-mono">{a.tool}</span></p>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words bg-ink p-3 font-mono text-xs text-mute">{JSON.stringify(a.input, null, 2)}</pre>
                  <div className="mt-3 flex gap-2">
                    <form action={decideRun.bind(null, r.id, true)}><button className={btnPrimary}>Approve</button></form>
                    <form action={decideRun.bind(null, r.id, false)}><button className={btnGhost}>Reject</button></form>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className={labelCls}>Your agents</h2>
        {(agents ?? []).length === 0 ? (
          <p className="text-sm text-mute">No agents yet. Create your first below.</p>
        ) : (
          <div className="divide-y divide-line border-y border-line">
            {(agents ?? []).map((a) => (
              <Link key={a.id} href={`/app/agents/${a.id}`} className="flex min-h-[44px] items-center justify-between gap-4 py-4 hover:bg-panel">
                <span className="truncate">{a.name}</span>
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-widest text-mute">{(a.tools as string[]).length} tools · {fmtDate(a.created_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className={labelCls}>New agent</h2>
        <form action={createAgent} className="space-y-3">
          <input name="name" required maxLength={100} className={inputCls} placeholder="Name (e.g. Lead follow-up)" />
          <textarea name="instructions" maxLength={8000} className={`${inputCls} min-h-[96px] py-2`} placeholder="Instructions: what should this agent do, and how?" />
          <div className="flex flex-wrap gap-4">
            {Object.entries(TOOL_CATALOG).map(([k, t]) => (
              <label key={k} className="flex min-h-[44px] items-center gap-2 text-sm">
                <input type="checkbox" name="tools" value={k} />
                {t.label}{t.sensitive && <span className="font-mono text-[10px] uppercase text-mute">needs approval</span>}
              </label>
            ))}
          </div>
          <button className={btnPrimary}>Create agent</button>
        </form>
      </section>

      <section className="mb-8">
        <h2 className={labelCls}>API keys</h2>
        <KeyPanel keys={keys ?? []} canManage={role === "owner"} />
      </section>

      <section>
        <h2 className={labelCls}>Quickstart</h2>
        <pre className="overflow-x-auto bg-panel p-4 font-mono text-xs leading-relaxed text-mute">{`curl ${base}/v1/agents/AGENT_ID/runs \\
  -H "Authorization: Bearer cbk_..." \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -H "Content-Type: application/json" \\
  -d '{"input":"Follow up with the latest lead"}'

GET  /v1/runs/{id}            status, output, events
POST /v1/runs/{id}/approve    {"approve": true}
GET  /v1/usage                runs used this year
POST /v1/webhooks             {"url":"https://..."}  (HMAC-signed)
Add ?stream=1 to the run call for server-sent events.`}</pre>
      </section>
    </>
  );
}
