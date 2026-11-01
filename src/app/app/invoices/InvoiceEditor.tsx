"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveInvoice, sendInvoice, markPaid, deleteInvoice } from "./actions";
import { calcTotals, money, fmtDate, inputCls, labelCls, btnPrimary, btnGhost, type LineItem } from "@/components/cubits/util";
import StatusBadge from "@/components/cubits/StatusBadge";

export type InvoiceDoc = {
  id?: string;
  kind: "invoice" | "quote";
  number: string;
  client_name: string;
  client_email: string;
  items: LineItem[];
  tax_rate: number;
  notes: string;
  due_date: string;
  status: string;
};

type Brand = { name: string; logo_url: string | null; company_details: string | null; currency: string };

export default function InvoiceEditor({ initial, brand }: { initial: InvoiceDoc; brand: Brand }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [doc, setDoc] = useState<InvoiceDoc>(initial);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const t = calcTotals(doc.items, doc.tax_rate);
  const set = <K extends keyof InvoiceDoc>(k: K, v: InvoiceDoc[K]) => setDoc((d) => ({ ...d, [k]: v }));
  const setItem = (i: number, patch: Partial<LineItem>) =>
    setDoc((d) => ({ ...d, items: d.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) }));
  const label = doc.kind === "quote" ? "Quote" : "Invoice";

  function payload() {
    return {
      id: doc.id,
      kind: doc.kind,
      client_name: doc.client_name,
      client_email: doc.client_email,
      items: doc.items.map((i) => ({ description: i.description, qty: Number(i.qty) || 0, unit_price: Number(i.unit_price) || 0 })),
      tax_rate: Number(doc.tax_rate) || 0,
      notes: doc.notes,
      due_date: doc.due_date,
    };
  }

  function save() {
    start(async () => {
      const r = await saveInvoice(payload());
      if (!r.ok) return setMsg({ type: "err", text: r.error });
      if (!doc.id) router.push(`/app/invoices/${r.id}`);
      else {
        setMsg({ type: "ok", text: "Saved" });
        router.refresh();
      }
    });
  }
  function send() {
    if (!doc.id) return;
    start(async () => {
      const s = await saveInvoice(payload());
      if (!s.ok) return setMsg({ type: "err", text: s.error });
      const r = await sendInvoice(doc.id!, note);
      if (!r.ok) return setMsg({ type: "err", text: r.error });
      setMsg({ type: "ok", text: "Sent" });
      set("status", "sent");
      router.refresh();
    });
  }
  function paid() {
    if (!doc.id) return;
    start(async () => {
      const r = await markPaid(doc.id!);
      if (!r.ok) return setMsg({ type: "err", text: r.error });
      set("status", "paid");
      setMsg({ type: "ok", text: "Marked paid" });
      router.refresh();
    });
  }
  function del() {
    if (!doc.id || !confirm("Delete this document?")) return;
    start(async () => {
      const r = await deleteInvoice(doc.id!);
      if (!r.ok) return setMsg({ type: "err", text: r.error });
      router.push("/app/invoices");
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <style>{`
@media print {
  body * { visibility: hidden !important; }
  #invoice-print, #invoice-print * { visibility: visible !important; }
  #invoice-print { position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; color: #000 !important; border: 0 !important; }
  html, body { background: #fff !important; }
}`}</style>

      <div className="space-y-6 min-w-0">
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-full border border-line p-1">
            {(["invoice", "quote"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => set("kind", k)}
                className={`min-h-[36px] rounded-full px-4 font-mono text-[11px] uppercase tracking-widest ${doc.kind === k ? "bg-paper text-black" : "text-mute"}`}
              >
                {k}
              </button>
            ))}
          </div>
          {doc.id && <StatusBadge status={doc.status} />}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Client name</label>
            <input className={inputCls} value={doc.client_name} onChange={(e) => set("client_name", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Client email</label>
            <input className={inputCls} type="email" value={doc.client_email} onChange={(e) => set("client_email", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Due date</label>
            <input className={inputCls} type="date" value={doc.due_date} onChange={(e) => set("due_date", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Tax rate (%)</label>
            <input className={inputCls} type="number" min={0} max={100} step="0.01" value={doc.tax_rate} onChange={(e) => set("tax_rate", Number(e.target.value))} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Line items</label>
          <div className="space-y-3">
            {doc.items.map((it, i) => (
              <div key={i} className="rounded-lg border border-line p-3 space-y-2">
                <input className={inputCls} placeholder="Description" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} />
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input className={inputCls} type="number" min={0} step="any" placeholder="Qty" aria-label="Quantity" value={it.qty} onChange={(e) => setItem(i, { qty: Number(e.target.value) })} />
                  <input className={inputCls} type="number" min={0} step="any" placeholder="Unit price" aria-label="Unit price" value={it.unit_price} onChange={(e) => setItem(i, { unit_price: Number(e.target.value) })} />
                  <button
                    type="button"
                    aria-label="Remove item"
                    className="min-h-[44px] min-w-[44px] rounded-lg border border-line text-mute hover:text-paper"
                    onClick={() => set("items", doc.items.filter((_, idx) => idx !== i))}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className={`${btnGhost} mt-3`} onClick={() => set("items", [...doc.items, { description: "", qty: 1, unit_price: 0 }])}>
            + Add item
          </button>
        </div>

        <div>
          <label className={labelCls}>Notes</label>
          <textarea className={`${inputCls} py-2 min-h-[96px]`} value={doc.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>

        {msg && <p className={`font-mono text-xs ${msg.type === "err" ? "text-red-400" : "text-emerald-400"}`}>{msg.text}</p>}

        <div className="flex flex-wrap gap-3">
          <button className={btnPrimary} disabled={pending} onClick={save}>{pending ? "Working…" : doc.id ? "Save" : `Create ${label.toLowerCase()}`}</button>
          {doc.id && (
            <>
              <button className={btnGhost} type="button" onClick={() => window.print()}>Download PDF</button>
              {doc.status !== "paid" && <button className={btnGhost} disabled={pending} onClick={paid}>Mark paid</button>}
              <button className={btnGhost} disabled={pending} onClick={del}>Delete</button>
            </>
          )}
        </div>

        {doc.id && (
          <div className="rounded-lg border border-line p-4 space-y-3">
            <label className={labelCls}>Send to client</label>
            <textarea className={`${inputCls} py-2 min-h-[72px]`} placeholder="Optional note to include in the email" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className={btnPrimary} disabled={pending || !doc.client_email} onClick={send}>
              {doc.status === "draft" ? `Send ${label.toLowerCase()}` : "Resend"}
            </button>
            {!doc.client_email && <p className="font-mono text-[11px] text-mute">Add a client email to send.</p>}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className={labelCls}>Preview</div>
        <div id="invoice-print" className="rounded-lg border border-line bg-white p-5 sm:p-8 text-black text-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {brand.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.logo_url} alt="" className="mb-2 max-h-12 max-w-[160px] object-contain" />
              )}
              <div className="text-lg font-semibold break-words">{brand.name}</div>
              {brand.company_details && <div className="mt-1 whitespace-pre-wrap text-xs text-neutral-600 break-words">{brand.company_details}</div>}
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono text-xs uppercase tracking-widest text-neutral-500">{label}</div>
              <div className="text-lg font-semibold">{doc.number || (doc.kind === "quote" ? "QUO-####" : "INV-####")}</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Billed to</div>
              <div className="break-words font-medium">{doc.client_name || "Client name"}</div>
              <div className="break-words text-xs text-neutral-600">{doc.client_email}</div>
            </div>
            <div className="text-right">
              {doc.due_date && (
                <>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">{doc.kind === "quote" ? "Valid until" : "Due"}</div>
                  <div>{fmtDate(doc.due_date)}</div>
                </>
              )}
            </div>
          </div>

          <table className="mt-6 w-full table-fixed border-collapse">
            <thead>
              <tr className="border-b border-neutral-300 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                <th className="py-2 text-left">Description</th>
                <th className="w-10 py-2 text-right">Qty</th>
                <th className="w-20 py-2 text-right">Price</th>
                <th className="w-24 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((it, i) => (
                <tr key={i} className="border-b border-neutral-200 align-top">
                  <td className="py-2 pr-2 break-words">{it.description}</td>
                  <td className="py-2 text-right">{it.qty}</td>
                  <td className="py-2 text-right">{money(Number(it.unit_price) || 0, brand.currency)}</td>
                  <td className="py-2 text-right">{money((Number(it.qty) || 0) * (Number(it.unit_price) || 0), brand.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 ml-auto w-full max-w-[240px] space-y-1">
            <div className="flex justify-between"><span className="text-neutral-600">Subtotal</span><span>{money(t.subtotal, brand.currency)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-600">Tax ({Number(doc.tax_rate) || 0}%)</span><span>{money(t.tax, brand.currency)}</span></div>
            <div className="flex justify-between border-t border-neutral-300 pt-1 text-base font-semibold"><span>Total</span><span>{money(t.total, brand.currency)}</span></div>
          </div>

          {doc.notes && <div className="mt-6 whitespace-pre-wrap break-words text-xs text-neutral-600">{doc.notes}</div>}
        </div>
      </div>
    </div>
  );
}
