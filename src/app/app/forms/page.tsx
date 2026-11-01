import Link from "next/link";
import { requireWorkspace } from "@/lib/workspace";
import { supabaseServer } from "@/lib/supabase/server";
import { btnPrimary, fmtDate } from "@/components/cubits/util";

export const dynamic = "force-dynamic";

export default async function FormsPage() {
  const { workspace } = await requireWorkspace();
  const supabase = await supabaseServer();
  const { data: forms } = await supabase
    .from("forms")
    .select("id, name, slug, created_at")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });
  const { data: subs } = await supabase.from("submissions").select("form_id").eq("workspace_id", workspace.id);
  const counts = new Map<string, number>();
  for (const s of subs ?? []) counts.set(s.form_id, (counts.get(s.form_id) ?? 0) + 1);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Forms</h1>
        <Link href="/app/forms/new" className={btnPrimary}>New</Link>
      </div>
      {(forms ?? []).length === 0 ? (
        <p className="mt-10 text-mute">No forms yet.</p>
      ) : (
        <div className="mt-8 divide-y divide-line border-y border-line">
          {(forms ?? []).map((f) => (
            <Link key={f.id} href={`/app/forms/${f.id}`} className="flex min-h-[44px] items-center justify-between gap-4 py-4 hover:bg-panel">
              <div className="min-w-0">
                <div className="truncate">{f.name}</div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-mute">/f/{f.slug} · {fmtDate(f.created_at)}</div>
              </div>
              <div className="shrink-0 font-mono text-xs text-mute">{counts.get(f.id) ?? 0} leads</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
