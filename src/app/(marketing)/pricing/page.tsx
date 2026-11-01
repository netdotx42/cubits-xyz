import type { Metadata } from "next";
import { Button } from "@/components/marketing/Button";
import { Label, Section, H2, Faq, FinalCta } from "@/components/marketing/ui";

export const metadata: Metadata = { title: "Pricing | Cubits", description: "One plan. $29 a month per workspace, up to 5 seats." };

const included = [
  "Invoices and quotes with your branding",
  "Embeddable lead forms",
  "Automations: email, Slack and webhook actions",
  "Up to 5 seats per workspace",
  "About 1,000 automation runs per month",
  "Data export any time",
  "Email support",
];

const faq = [
  { q: "How does the free trial work?", a: "You get 7 days with everything unlocked. We take a card upfront and bill $29 when the trial ends." },
  { q: "Can I cancel any time?", a: "Yes. Cancel from workspace settings in one click. Cancel during the trial and you are not charged." },
  { q: "What happens at 1,000 automation runs?", a: "Automations are capped at about 1,000 runs per workspace per month. Past that, rules pause until the next cycle. Invoices and forms keep working." },
  { q: "What if we need more than 5 seats?", a: "Book a demo and tell us your team size. We will work out something sensible." },
  { q: "How does annual billing work?", a: "$290 a year, which is two months free. Switch any time from billing settings." },
];

export default function Pricing() {
  return (
    <>
      <section className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(ellipse_50%_60%_at_50%_0%,rgba(255,255,255,0.10),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 text-center sm:px-6 md:pt-28">
          <Label>Pricing</Label>
          <h1 className="mt-6 text-[clamp(2.5rem,9vw,5.5rem)] font-semibold leading-[0.97] tracking-tighter">One plan. No tiers.</h1>
          <p className="mx-auto mt-5 max-w-md text-mute">Everything in Cubits for a flat monthly price per workspace.</p>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4 pb-24 sm:px-6">
        <div className="rounded-2xl border border-line bg-panel p-6 sm:p-10">
          <Label>Cubits</Label>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-[clamp(3.5rem,14vw,5.5rem)] font-semibold leading-none tracking-tighter">$29</span>
            <span className="text-mute">/ month per workspace</span>
          </div>
          <p className="mt-3 text-sm text-mute">Or $290 a year. That is two months free.</p>
          <ul className="mt-8 border-t border-line">
            {included.map((i) => (
              <li key={i} className="flex min-h-[44px] items-center gap-3 border-b border-line py-2 text-sm">
                <span aria-hidden className="text-[8px] text-mute">◼</span>{i}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/signup" className="sm:flex-1">Start 7-day free trial</Button>
            <Button href="/contact" variant="ghost" className="sm:flex-1">Book a demo</Button>
          </div>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-mute">Card upfront. Cancel any time.</p>
        </div>
      </div>

      <Section>
        <Label>FAQ</Label>
        <div className="mb-10 mt-4"><H2>Trial, billing, cancelling.</H2></div>
        <Faq items={faq} />
      </Section>

      <FinalCta />
    </>
  );
}
