import { notFound } from "next/navigation";
import Link from "next/link";
import { requireWorkspace } from "@/lib/workspace";
import { supabaseServer } from "@/lib/supabase/server";
import CopyButton from "@/components/cubits/CopyButton";
import { btnGhost, labelCls } from "@/components/cubits/util";
import type { FormField } from "@/components/cubits/forms";

export const dynamic = "force-dynamic";

export default async function FormDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireWorkspace();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await supabaseServer();
  const { data: form } = await supabase.from("forms").select("*").eq("id", id).eq("workspace_id", workspace.id).maybeSingle();
  if (!form) notFound();
  const { data: subs } = await supabase
    .from("submissions")
    .select("id, data, created_at")
    .eq("form_id", form.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const fields = (form.fields ?? []) as FormField[];
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const link = `${base}/f/${form.slug}`;
  const embed = `<iframe src="${link}" width="100%" height="520" style="border:0" title="${form.name.replace(/"/g, "&quot;")}"></iframe>`;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <Link href="/app/forms" className="font-mono text-[11px] uppercase tracking-widest text-mute hover:text-paper">← Forms</Link>
      <div className="mb-8 mt-3 flex items-center justify-between gap-4">
        <h1 className="min-w-0 break-words text-2xl font-semibold">{form.name}</h1>
        <Link href={`/app/forms/${form.id}/edit`} className={btnGhost}>Edit</Link>
      </div>

      <div className="space-y-6">
        <div>
          <div className={labelCls}>Public link</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <code className="min-w-0 flex-1 break-all rounded-lg border border-line bg-panel px-3 py-3 text-sm">{link}</code>
            <CopyButton text={link} />
          </div>
        </div>
        <div>
          <div className={labelCls}>Embed snippet</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <code className="min-w-0 flex-1 break-all rounded-lg border border-line bg-panel px-3 py-3 text-xs">{embed}</code>
            <CopyButton text={embed} />
          </div>
        </div>
      </div>

      <h2 className="mb-3 mt-12 font-mono text-[11px] uppercase tracking-widest text-mute">Submissions ({subs?.length ?? 0})</h2>
      {(subs ?? []).length === 0 ? (
        <p className="text-mute">No submissions yet.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-widest text-mute">
                  <th className="py-3 font-normal">Received</th>
                  {fields.map((f) => (<th key={f.name} className="font-normal">{f.label}</th>))}
                </tr>
              </thead>
              <tbody>
                {(subs ?? []).map((s) => (
                  <tr key={s.id} className="border-b border-line align-top">
                    <td className="whitespace-nowrap py-3 pr-4 text-mute">{new Date(s.created_at).toLocaleString()}</td>
                    {fields.map((f) => (
                      <td key={f.name} className="max-w-[260px] break-words py-3 pr-4 whitespace-pre-wrap">{String((s.data as Record<string, unknown>)?.[f.name] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {(subs ?? []).map((s) => (
              <div key={s.id} className="rounded-lg border border-line p-4">
                <div className="mb-2 font-mono text-[11px] text-mute">{new Date(s.created_at).toLocaleString()}</div>
                {fields.map((f) => (
                  <div key={f.name} className="mb-2">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-mute">{f.label}</div>
                    <div className="whitespace-pre-wrap break-words">{String((s.data as Record<string, unknown>)?.[f.name] ?? "")}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
