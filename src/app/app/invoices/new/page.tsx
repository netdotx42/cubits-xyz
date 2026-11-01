import { requireWorkspace } from "@/lib/workspace";
import InvoiceEditor from "../InvoiceEditor";

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { workspace } = await requireWorkspace();
  const { kind } = await searchParams;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">New {kind === "quote" ? "quote" : "invoice"}</h1>
      <InvoiceEditor
        brand={{ name: workspace.name, logo_url: workspace.logo_url, company_details: workspace.company_details, currency: workspace.currency }}
        initial={{
          kind: kind === "quote" ? "quote" : "invoice",
          number: "",
          client_name: "",
          client_email: "",
          items: [{ description: "", qty: 1, unit_price: 0 }],
          tax_rate: 0,
          notes: "",
          due_date: "",
          status: "draft",
        }}
      />
    </div>
  );
}
