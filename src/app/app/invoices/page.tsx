import Link from "next/link";
import { requireWorkspace } from "@/lib/workspace";
import { supabaseServer } from "@/lib/supabase/server";
import { calcTotals, money, fmtDate, btnPrimary, type LineItem } from "@/components/cubits/util";
import StatusBadge from "@/components/cubits/StatusBadge";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const { workspace } = await requireWorkspace();
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("invoices")
    .select("id, kind, number, client_name, items, tax_rate, status, due_date, created_at")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });
  const rows = (data ?? []).map((r) => ({
    ...r,
    total: calcTotals((r.items ?? []) as LineItem[], Number(r.tax_rate)).total,
  }));
  const outstanding = rows.filter((r) => r.kind === "invoice" && r.status === "sent").reduce((s, r) => s + r.total, 0);
  const paid = rows.filter((r) => r.kind === "invoice" && r.status === "paid").reduce((s, r) => s + r.total, 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <Link href="/app/invoices/new" className={btnPrimary}>New</Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {[["Outstanding", outstanding], ["Paid", paid]].map(([l, v]) => (
          <div key={l as string} className="rounded-lg border border-line p-4">
            <div className="font-mono text-[11px] uppercase tracking-widest text-mute">{l as string}</div>
            <div className="mt-1 text-xl break-words">{money(v as number, workspace.currency)}</div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 text-mute">No invoices or quotes yet.</p>
      ) : (
        <>
          <table className="mt-8 hidden w-full md:table">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-widest text-mute">
                <th className="py-3 font-normal">Number</th>
                <th className="font-normal">Client</th>
                <th className="font-normal">Status</th>
                <th className="font-normal">Due</th>
                <th className="text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line hover:bg-panel">
                  <td className="py-3"><Link className="font-mono text-sm underline-offset-4 hover:underline" href={`/app/invoices/${r.id}`}>{r.number}</Link></td>
                  <td>{r.client_name}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-mute">{fmtDate(r.due_date)}</td>
                  <td className="text-right">{money(r.total, workspace.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-8 space-y-3 md:hidden">
            {rows.map((r) => (
              <Link key={r.id} href={`/app/invoices/${r.id}`} className="block rounded-lg border border-line p-4 min-h-[44px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm">{r.number}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-2 break-words">{r.client_name}</div>
                <div className="mt-1 flex justify-between text-sm text-mute">
                  <span>{fmtDate(r.due_date)}</span>
                  <span className="text-paper">{money(r.total, workspace.currency)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
