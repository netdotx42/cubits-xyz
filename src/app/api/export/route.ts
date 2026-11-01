import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/workspace";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

/** Read every row of a workspace table (Supabase returns at most 1,000 rows per request). */
async function fetchAll(table: string, workspaceId: string, workspaceCol = "workspace_id"): Promise<Row[]> {
  const supabase = await supabaseServer();
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq(workspaceCol, workspaceId)
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

function cell(v: unknown): string {
  let s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  // Stop spreadsheet apps from running user-entered text as a formula.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Row[]): string {
  if (!rows.length) return "";
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n") + "\n";
}

function download(body: string, filename: string, type: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": `${type}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** GET /api/export            full JSON export
 *  GET /api/export?type=invoices|submissions&format=csv   CSV of one dataset
 *  Owner only. Allowed even when the plan has lapsed: your data is yours. */
export async function GET(req: Request) {
  const { workspace, role } = await requireWorkspace({ allowUnpaid: true });
  if (role !== "owner") return NextResponse.json({ error: "Only the workspace owner can export data." }, { status: 403 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const day = new Date().toISOString().slice(0, 10);

  try {
    if (url.searchParams.get("format") === "csv") {
      if (type !== "invoices" && type !== "submissions") {
        return NextResponse.json({ error: "type must be invoices or submissions" }, { status: 400 });
      }
      const rows = await fetchAll(type, workspace.id);
      return download(toCsv(rows), `cubits-${type}-${day}.csv`, "text/csv");
    }

    const [invoices, forms, submissions, automations] = await Promise.all([
      fetchAll("invoices", workspace.id),
      fetchAll("forms", workspace.id),
      fetchAll("submissions", workspace.id),
      fetchAll("automations", workspace.id),
    ]);
    const body = JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        workspace: { name: workspace.name, currency: workspace.currency, company_details: workspace.company_details },
        invoices,
        forms,
        submissions,
        automations,
      },
      null,
      2
    );
    return download(body, `cubits-export-${day}.json`, "application/json");
  } catch (e) {
    console.error("export failed", e);
    return NextResponse.json({ error: "Export failed. Try again." }, { status: 500 });
  }
}
