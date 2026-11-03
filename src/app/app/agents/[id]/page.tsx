import Link from "next/link";
import { notFound } from "next/navigation";
import { hasAgentsAccess, requireWorkspace } from "@/lib/workspace";
import { supabaseServer } from "@/lib/supabase/server";
import { TOOL_CATALOG } from "@/lib/agents/tools";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/app/Card";
import { btnGhost, btnPrimary, fmtDate, inputCls, labelCls } from "@/components/cubits/util";
import { archiveAgent, updateAgent } from "../actions";
import { RunConsole } from "./RunConsole";

export const dynamic = "force-dynamic";
// Server actions on this page run agents, which can take up to ~50 s.
export const maxDuration = 60;

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { workspace } = await requireWorkspace({ allowUnpaid: true });
  if (!hasAgentsAccess(workspace)) notFound();
  const supabase = await supabaseServer();
  const { data: agent } = await supabase.from("agents").select("*").eq("id", id).eq("workspace_id", workspace.id).eq("archived", false).maybeSingle();
  if (!agent) notFound();
  const { data: runs } = await supabase
    .from("runs").select("id, status, input, output, error, tokens_in, tokens_out, source, created_at")
    .eq("agent_id", id).order("created_at", { ascending: false }).limit(15);

  return (
    <>
      <PageHeader title={agent.name} subtitle={`ID ${agent.id}`} actions={<Link href="/app/agents" className={btnGhost}>All agents</Link>} />
      <section className="mb-8"><h2 className={labelCls}>Try it</h2><RunConsole agentId={id} /></section>

      <section className="mb-8">
        <h2 className={labelCls}>Configuration</h2>
        <form action={updateAgent.bind(null, id)} className="space-y-3">
          <input name="name" required maxLength={100} defaultValue={agent.name} className={inputCls} />
          <textarea name="instructions" maxLength={8000} defaultValue={agent.instructions} className={`${inputCls} min-h-[140px] py-2`} />
          <div className="flex flex-wrap gap-4">
            {Object.entries(TOOL_CATALOG).map(([k, t]) => (
              <label key={k} className="flex min-h-[44px] items-center gap-2 text-sm">
                <input type="checkbox" name="tools" value={k} defaultChecked={(agent.tools as string[]).includes(k)} />
                {t.label}{t.sensitive && <span className="font-mono text-[10px] uppercase text-mute">needs approval</span>}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button className={btnPrimary}>Save</button>
          </div>
        </form>
        <form action={archiveAgent.bind(null, id)} className="mt-3"><button className={btnGhost}>Archive agent</button></form>
      </section>

      <section>
        <h2 className={labelCls}>Recent runs</h2>
        {(runs ?? []).length === 0 ? <p className="text-sm text-mute">No runs yet.</p> : (
          <div className="space-y-3">
            {(runs ?? []).map((r) => (
              <Card key={r.id}>
                <div className="flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-widest text-mute">
                  <span>{r.status.replace("_", " ")} · {r.source}</span>
                  <span>{r.tokens_in + r.tokens_out} tokens · {fmtDate(r.created_at)}</span>
                </div>
                <p className="mt-2 text-sm text-mute">{r.input}</p>
                {r.output && <p className="mt-2 whitespace-pre-wrap text-sm">{r.output}</p>}
                {r.error && <p className="mt-2 text-sm text-red-400">{r.error}</p>}
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
