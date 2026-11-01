import { Button } from "./Button";

export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`font-mono text-[11px] uppercase tracking-widest text-mute ${className}`}>{children}</div>;
}

export function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-20 border-t border-line ${className}`}>
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">{children}</div>
    </section>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="max-w-3xl text-[clamp(2rem,6vw,3.75rem)] font-semibold leading-[1.02] tracking-tighter">{children}</h2>;
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="border-t border-line">
      {items.map((i) => (
        <details key={i.q} className="group border-b border-line">
          <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-base tracking-tight sm:text-lg [&::-webkit-details-marker]:hidden">
            {i.q}
            <span aria-hidden className="font-mono text-mute transition-transform duration-200 group-open:rotate-45">+</span>
          </summary>
          <p className="max-w-2xl pb-6 text-mute">{i.a}</p>
        </details>
      ))}
    </div>
  );
}

export function FinalCta() {
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6 md:py-36">
        <h2 className="mx-auto max-w-3xl text-[clamp(2.25rem,8vw,5rem)] font-semibold leading-[0.98] tracking-tighter">
          Run the paperwork. Skip the tool sprawl.
        </h2>
        <p className="mx-auto mt-6 max-w-md text-mute">7 days free. Card upfront, cancel any time.</p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button href="/signup">Start 7-day free trial</Button>
          <Button href="/contact" variant="ghost">Book a demo</Button>
        </div>
      </div>
    </section>
  );
}
