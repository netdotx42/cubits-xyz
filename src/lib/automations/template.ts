const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

const BLOCKED = new Set(["__proto__", "constructor", "prototype"]);

/** Dotted-path lookup into plain data. Returns "" when missing. */
export function lookup(payload: unknown, path: string): string {
  let cur: unknown = payload;
  for (const key of path.split(".")) {
    if (BLOCKED.has(key) || cur === null || typeof cur !== "object") return "";
    if (!Object.prototype.hasOwnProperty.call(cur, key)) return "";
    cur = (cur as Record<string, unknown>)[key];
  }
  if (cur === null || cur === undefined) return "";
  if (typeof cur === "object") {
    try {
      return JSON.stringify(cur);
    } catch {
      return "";
    }
  }
  return String(cur);
}

/** Replaces {{path}} with payload values. No code evaluation. escape=true HTML-escapes values. */
export function render(template: string, payload: unknown, opts: { escape?: boolean } = {}): string {
  return template.replace(/\{\{\s*([A-Za-z0-9_.\-]+)\s*\}\}/g, (_m, path: string) => {
    const v = lookup(payload, path);
    return opts.escape ? escapeHtml(v) : v;
  });
}
