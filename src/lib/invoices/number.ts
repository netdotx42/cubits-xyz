import type { SupabaseClient } from "@supabase/supabase-js";

export type InvoiceKind = "invoice" | "quote";

export const PREFIX: Record<InvoiceKind, string> = { invoice: "INV-", quote: "QUO-" };

/** Next number after the highest existing one of this kind, e.g. INV-0042. */
export function nextNumberFrom(existing: string[], kind: InvoiceKind): string {
  const prefix = PREFIX[kind];
  let max = 0;
  for (const n of existing) {
    const m = new RegExp(`^${prefix}(\\d+)$`).exec(n);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export async function nextNumber(db: SupabaseClient, workspaceId: string, kind: InvoiceKind): Promise<string> {
  const { data, error } = await db.from("invoices").select("number").eq("workspace_id", workspaceId).eq("kind", kind);
  if (error) throw new Error(error.message);
  return nextNumberFrom((data ?? []).map((r) => String((r as { number: string }).number)), kind);
}

const UNIQUE_VIOLATION = "23505";

/**
 * Inserts an invoice or quote with the next free number. The unique index on
 * (workspace_id, kind, number) turns a race into a retry instead of a duplicate.
 */
export async function insertNumbered<T = { id: string; number: string }>(
  db: SupabaseClient,
  row: Record<string, unknown> & { workspace_id: string; kind: InvoiceKind },
  select = "id, number"
): Promise<T> {
  let lastError = "Could not create";
  for (let attempt = 0; attempt < 5; attempt++) {
    const number = await nextNumber(db, row.workspace_id, row.kind);
    const { data, error } = await db.from("invoices").insert({ ...row, number }).select(select).single();
    if (!error && data) return data as T;
    lastError = error?.message ?? lastError;
    if (error?.code !== UNIQUE_VIOLATION) break;
  }
  throw new Error(lastError);
}
