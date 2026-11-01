export function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type LineItem = { description: string; qty: number; unit_price: number };

export function calcTotals(items: LineItem[], taxRate: number) {
  const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unit_price) || 0), 0);
  const tax = subtotal * ((Number(taxRate) || 0) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

export function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  const dt = new Date(d.length === 10 ? d + "T00:00:00" : d);
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export const labelCls = "block font-mono text-[11px] uppercase tracking-widest text-mute mb-2";
export const inputCls =
  "w-full min-h-[44px] rounded-lg border border-line bg-ink px-3 text-[15px] text-paper placeholder:text-mute focus:outline-none focus:border-paper";
export const btnPrimary =
  "inline-flex items-center justify-center min-h-[44px] rounded-full bg-paper px-5 text-sm font-medium text-black hover:bg-white disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center min-h-[44px] rounded-full border border-line px-5 text-sm text-paper hover:border-mute disabled:opacity-50";
