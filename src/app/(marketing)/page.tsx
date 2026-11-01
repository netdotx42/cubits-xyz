import { Button } from "@/components/marketing/Button";
import { Label, Section, H2, Faq, FinalCta } from "@/components/marketing/ui";
import { InvoiceMock, FormMock, AutomationMock } from "@/components/marketing/Mocks";

const faq = [
  { q: "Who is Cubits for?", a: "Small businesses and agencies of 5 to 50 people that want invoicing, lead capture and simple automation without paying for three separate tools." },
  { q: "What does it cost?", a: "$29 a month per workspace, flat, up to 5 seats. Annual is $290, which is two months free. There is one plan." },
  { q: "How does the trial work?", a: "7 days free. We take a card upfront and charge $29 when the trial ends unless you cancel first." },
  { q: "Is there a limit on automations?", a: "Automations are capped at about 1,000 runs per workspace per month. Invoices and forms are not metered." },
  { q: "Who owns the data?", a: "You do. Export it any time. A data processing agreement is available on request." },
];

const cubits = [
  { n: "01", name: "Invoices", text: "Branded invoices and quotes that go out in seconds and get paid faster.", mock: <InvoiceMock /> },
  { n: "02", name: "Forms", text: "Turn every visitor into a lead, delivered straight to your inbox or Slack.", mock: <FormMock /> },
  { n: "03", name: "Automations", text: "Set the trigger. Let it run. Email, Slack or webhook, on autopilot.", mock: <AutomationMock /> },
];

export default function Home() {
  return (
    <>
      <section className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(ellipse_50%_60%_at_50%_0%,rgba(125,211,252,0.24),transparent)]" />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-40 h-72 w-72 -translate-x-1/2 rounded-full bg-glow/10 blur-3xl md:h-96 md:w-96" />
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-20 text-center sm:px-6 md:pb-36 md:pt-32">
          <Label>Invoice. Capture. Automate.</Label>
          <h1 className="mx-auto mt-6 max-w-4xl text-[clamp(2.5rem,10vw,6.5rem)] font-semibold leading-[0.95] tracking-tighter">
            Power your business with the tools it <span className="bg-gradient-to-r from-glow-soft via-glow to-white bg-clip-text text-transparent">actually runs on.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-mute sm:text-lg">
            Invoice faster. Capture every lead. Automate the follow-up. Cubits puts the engine of your business in one workspace for $29 a month, flat.
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button href="/signup">Start 7-day free trial</Button>
            <Button href="/login" variant="ghost">Log in</Button>
          </div>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-mute">Card upfront. Cancel any time.</p>
        </div>
      </section>

      <Section>
        <Label>The engine</Label>
        <div className="mt-4"><H2>Three tools. Full momentum.</H2></div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {cubits.map((c) => (
            <div key={c.name} className="flex flex-col">
              {c.mock}
              <div className="mt-5 font-mono text-[11px] uppercase tracking-widest text-glow">{c.n}</div>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight">{c.name}</h3>
              <p className="mt-2 text-mute">{c.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-10"><Button href="/cubits" variant="ghost">See each tool in depth</Button></div>
      </Section>

      <Section>
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <Label>Automations</Label>
            <div className="mt-4"><H2>Automations power the whole thing.</H2></div>
            <p className="mt-6 max-w-md text-mute">
              A lead lands, Slack lights up, a reply fires. An invoice is paid, your team knows instantly. Set a rule once and it works around the clock.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-0 md:flex-row md:items-center">
            {[["Trigger", "Form submitted"], ["Action", "Slack + email"]].map(([l, t], i) => (
              <div key={l} className="contents">
                {i === 1 && (
                  <div className="flex items-center justify-center md:flex-1">
                    <div className="h-8 w-px bg-glow/50 md:h-px md:w-full md:min-w-[32px]" />
                    <span aria-hidden className="hidden font-mono text-glow md:inline">›</span>
                  </div>
                )}
                <div className="rounded-xl border border-glow/25 bg-panel p-5 shadow-[0_0_36px_-16px_rgba(125,211,252,0.6)] md:w-40 md:shrink-0">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-mute">{l}</div>
                  <div className="mt-2 text-lg font-semibold tracking-tight">{t}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section>
        <Label>Built for teams</Label>
        <div className="mt-4"><H2>One workspace. Full power. One bill.</H2></div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Workspaces", "Give every client or business its own space, with its own branding."],
            ["Invites", "Bring your whole team. Five seats included, added by email in seconds."],
            ["One bill", "$29 a month powers every tool. No per-tool add-ons."],
            ["Data stays yours", "Your data, your control. Export any time. DPA on request."],
          ].map(([t, d]) => (
            <div key={t} className="bg-black p-6 transition-colors duration-200 hover:bg-glow/[0.04]">
              <h3 className="text-lg font-semibold tracking-tight">{t}</h3>
              <p className="mt-2 text-sm text-mute">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid items-end gap-10 md:grid-cols-2">
          <div>
            <Label>Pricing</Label>
            <div className="mt-4"><H2>One plan. Full power. $29 a month.</H2></div>
            <p className="mt-6 max-w-md text-mute">Everything unlocked, flat per workspace, up to 5 seats. Annual is $290, two months free.</p>
          </div>
          <div className="md:text-right">
            <Button href="/pricing" variant="ghost">See what is included</Button>
          </div>
        </div>
      </Section>

      <Section>
        <Label>FAQ</Label>
        <div className="mb-10 mt-4"><H2>Everything you need to know.</H2></div>
        <Faq items={faq} />
      </Section>

      <FinalCta />
    </>
  );
}
