"use client";
import { useState } from "react";
import type { FormField } from "@/components/cubits/forms";

const input =
  "w-full min-h-[44px] rounded-lg border border-[#1f1f1f] bg-black px-3 text-[16px] text-[#f5f5f5] placeholder:text-[#8a8a8a] focus:outline-none focus:border-[#f5f5f5]";

export default function PublicForm({ slug, fields }: { slug: string; fields: FormField[] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setState("sending");
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = { ...values, website: String(fd.get("website") ?? "") };
    try {
      const res = await fetch(`/api/forms/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Something went wrong");
      setState("done");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-[#1f1f1f] p-6 text-center">
        <div className="font-mono text-[11px] uppercase tracking-widest text-[#8a8a8a]">Sent</div>
        <p className="mt-2 text-lg">Thank you. We will be in touch.</p>
      </div>
    );
  }

  const label = "mb-2 block font-mono text-[11px] uppercase tracking-widest text-[#8a8a8a]";
  return (
    <form onSubmit={submit} className="space-y-5">
      {fields.map((f) => {
        const common = {
          id: f.name,
          name: f.name,
          required: f.required,
          value: values[f.name] ?? "",
        };
        const on = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
          setValues((v) => ({ ...v, [f.name]: e.target.value }));
        return (
          <div key={f.name}>
            <label htmlFor={f.name} className={label}>{f.label}{f.required ? " *" : ""}</label>
            {f.type === "textarea" ? (
              <textarea {...common} onChange={on} rows={5} className={`${input} py-2`} />
            ) : f.type === "select" ? (
              <select {...common} onChange={on} className={input}>
                <option value="">Select…</option>
                {(f.options ?? []).map((o) => (<option key={o} value={o}>{o}</option>))}
              </select>
            ) : (
              <input {...common} onChange={on} type={f.type === "email" ? "email" : f.type === "phone" ? "tel" : "text"} className={input} />
            )}
          </div>
        );
      })}
      {/* Honeypot: hidden from people, bots fill it. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" /></label>
      </div>
      {err && <p className="font-mono text-xs text-red-400">{err}</p>}
      <button
        type="submit"
        disabled={state === "sending"}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-[#f5f5f5] px-5 text-sm font-medium text-black disabled:opacity-50"
      >
        {state === "sending" ? "Sending…" : "Submit"}
      </button>
    </form>
  );
}
