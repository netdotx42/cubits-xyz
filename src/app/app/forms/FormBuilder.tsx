"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveForm, deleteForm } from "./actions";
import { FIELD_TYPES, type FieldType } from "@/components/cubits/forms";
import { inputCls, labelCls, btnPrimary, btnGhost } from "@/components/cubits/util";

type Draft = { label: string; type: FieldType; required: boolean; optionsText: string };
export type FormDraft = { id?: string; name: string; notify_email: string; fields: Draft[] };

export default function FormBuilder({ initial }: { initial: FormDraft }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState<FormDraft>(initial);
  const [err, setErr] = useState<string | null>(null);
  const setField = (i: number, patch: Partial<Draft>) =>
    setF((s) => ({ ...s, fields: s.fields.map((x, idx) => (idx === i ? { ...x, ...patch } : x)) }));
  const move = (i: number, d: -1 | 1) =>
    setF((s) => {
      const j = i + d;
      if (j < 0 || j >= s.fields.length) return s;
      const fields = [...s.fields];
      [fields[i], fields[j]] = [fields[j], fields[i]];
      return { ...s, fields };
    });

  function save() {
    setErr(null);
    start(async () => {
      const r = await saveForm({
        id: f.id,
        name: f.name,
        notify_email: f.notify_email,
        fields: f.fields.map((x) => ({
          label: x.label,
          type: x.type,
          required: x.required,
          options: x.type === "select" ? x.optionsText.split("\n").map((o) => o.trim()).filter(Boolean) : undefined,
        })),
      });
      if (!r.ok) return setErr(r.error);
      router.push(`/app/forms/${r.id}`);
      router.refresh();
    });
  }
  function del() {
    if (!f.id || !confirm("Delete this form and all its submissions?")) return;
    start(async () => {
      const r = await deleteForm(f.id!);
      if (!r.ok) return setErr(r.error);
      router.push("/app/forms");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <label className={labelCls}>Form name</label>
        <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </div>
      <div>
        <label className={labelCls}>Notify email (optional)</label>
        <input className={inputCls} type="email" value={f.notify_email} onChange={(e) => setF({ ...f, notify_email: e.target.value })} />
      </div>

      <div>
        <label className={labelCls}>Fields</label>
        <div className="space-y-3">
          {f.fields.map((x, i) => (
            <div key={i} className="rounded-lg border border-line p-3 space-y-3">
              <input className={inputCls} placeholder="Label" aria-label="Field label" value={x.label} onChange={(e) => setField(i, { label: e.target.value })} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select className={inputCls} aria-label="Field type" value={x.type} onChange={(e) => setField(i, { type: e.target.value as FieldType })}>
                  {FIELD_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
                <label className="flex min-h-[44px] items-center gap-2 text-sm">
                  <input type="checkbox" className="h-5 w-5" checked={x.required} onChange={(e) => setField(i, { required: e.target.checked })} />
                  Required
                </label>
              </div>
              {x.type === "select" && (
                <textarea className={`${inputCls} py-2 min-h-[80px]`} placeholder="One option per line" value={x.optionsText} onChange={(e) => setField(i, { optionsText: e.target.value })} />
              )}
              <div className="flex gap-2">
                <button type="button" className={`${btnGhost} px-4`} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                <button type="button" className={`${btnGhost} px-4`} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                <button type="button" className={`${btnGhost} px-4`} onClick={() => setF({ ...f, fields: f.fields.filter((_, idx) => idx !== i) })}>Remove</button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className={`${btnGhost} mt-3`} onClick={() => setF({ ...f, fields: [...f.fields, { label: "", type: "text", required: false, optionsText: "" }] })}>
          + Add field
        </button>
      </div>

      {err && <p className="font-mono text-xs text-red-400">{err}</p>}
      <div className="flex flex-wrap gap-3">
        <button className={btnPrimary} disabled={pending} onClick={save}>{pending ? "Saving…" : "Save form"}</button>
        {f.id && <button className={btnGhost} disabled={pending} onClick={del}>Delete</button>}
      </div>
    </div>
  );
}
