import Link from "next/link";

const cols = [
  { title: "Product", items: [["Cubits", "/cubits"], ["Pricing", "/pricing"], ["Start free trial", "/signup"], ["Log in", "/login"]] },
  { title: "Company", items: [["Contact", "/contact"], ["Book a demo", "/contact"]] },
  { title: "Legal", items: [["Privacy", "/contact#privacy"], ["Terms", "/contact#terms"]] },
];

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <span aria-hidden className="text-[10px]">◼</span> Cubits
          </div>
          <p className="mt-3 max-w-xs text-sm text-mute">Small tools for small teams. Invoices, forms and automations in one workspace.</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <div className="font-mono text-[11px] uppercase tracking-widest text-mute">{c.title}</div>
            <ul className="mt-3">
              {c.items.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="flex min-h-[44px] items-center text-sm transition-colors duration-200 hover:text-mute">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 font-mono text-[11px] uppercase tracking-widest text-mute sm:px-6">
          © {new Date().getFullYear()} Cubits
        </div>
      </div>
    </footer>
  );
}
