import { notFound } from "next/navigation";
import Link from "next/link";
import { requireWorkspace } from "@/lib/workspace";
import { supabaseServer } from "@/lib/supabase/server";
import InvoiceEditor from "../InvoiceEditor";
import type { LineItem } from "@/components/cubits/util";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireWorkspace();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await supabaseServer();
  const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).eq("workspace_id", workspace.id).maybeSingle();
  if (!inv) notFound();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Link href="/app/invoices" className="font-mono text-[11px] uppercase tracking-widest text-mute hover:text-paper">← Invoices</Link>
      <h1 className="mb-6 mt-3 text-2xl font-semibold">{inv.number}</h1>
      <InvoiceEditor
        key={`${inv.number}-${inv.status}-${inv.kind}`}
        brand={{ name: workspace.name, logo_url: workspace.logo_url, company_details: workspace.company_details, currency: workspace.currency }}
        initial={{
          id: inv.id,
          kind: inv.kind === "quote" ? "quote" : "invoice",
          number: inv.number,
          client_name: inv.client_name,
          client_email: inv.client_email ?? "",
          items: ((inv.items ?? []) as LineItem[]).map((i) => ({ description: i.description ?? "", qty: Number(i.qty) || 0, unit_price: Number(i.unit_price) || 0 })),
          tax_rate: Number(inv.tax_rate) || 0,
          notes: inv.notes ?? "",
          due_date: inv.due_date ?? "",
          status: inv.status,
        }}
      />
    </div>
  );
}
