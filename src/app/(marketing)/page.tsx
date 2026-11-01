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
  { n: "01", name: "Invoices", text: "Branded invoices and quotes. Send, track, get paid.", mock: <InvoiceMock /> },
  { n: "02", name: "Forms", text: "Embeddable lead forms that land in your inbox or Slack.", mock: <FormMock /> },
  { n: "03", name: "Automations", text: "Trigger, then action. Email, Slack or webhook.", mock: <AutomationMock /> },
];

export default function Home() {
  return (
    <>
      <section className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(ellipse_50%_60%_at_50%_0%,rgba(255,255,255,0.13),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-20 text-center sm:px-6 md:pb-36 md:pt-32">
          <Label>Invoices / Forms / Automations</Label>
          <h1 className="mx-auto mt-6 max-w-4xl text-[clamp(2.5rem,10vw,6.5rem)] font-semibold leading-[0.95] tracking-tighter">
            The small tools your business actually runs on.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-mute sm:text-lg">
            Cubits is one workspace for sending invoices, capturing leads and automating the follow-up. $29 a month, flat.
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button href="/signup">Start 7-day free trial</Button>
            <Button href="/login" variant="ghost">Log in</Button>
          </div>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-mute">Card upfront. Cancel any time.</p>
        </div>
      </section>

      <Section>
        <Label>The cubits</Label>
        <div className="mt-4"><H2>Three tools. No bloat.</H2></div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {cubits.map((c) => (
            <div key={c.name} className="flex flex-col">
              {c.mock}
              <div className="mt-5 font-mono text-[11px] uppercase tracking-widest text-mute">{c.n}</div>
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
            <div className="mt-4"><H2>Automations tie it together.</H2></div>
            <p className="mt-6 max-w-md text-mute">
              A form comes in, Slack pings, a reply goes out. An invoice goes overdue, the client gets a nudge. Rules are one trigger and one or more actions.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-0 md:flex-row md:items-center">
            {[["Trigger", "Form submitted"], ["Action", "Slack + email"]].map(([l, t], i) => (
              <div key={l} className="contents">
                {i === 1 && (
                  <div className="flex items-center justify-center md:flex-1">
                    <div className="h-8 w-px bg-line md:h-px md:w-full md:min-w-[32px]" />
                    <span aria-hidden className="hidden font-mono text-mute md:inline">›</span>
                  </div>
                )}
                <div className="rounded-xl border border-line bg-panel p-5 md:w-40 md:shrink-0">
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
        <div className="mt-4"><H2>One workspace. One bill.</H2></div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Workspaces", "Each client or business gets its own space with its own branding."],
            ["Invites", "Up to 5 seats included. Invite by email, remove in a click."],
            ["One bill", "$29 a month covers every tool. No per-tool add-ons."],
            ["Data stays yours", "Export any time. DPA available on request."],
          ].map(([t, d]) => (
            <div key={t} className="bg-black p-6">
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
            <div className="mt-4"><H2>One plan. $29 a month.</H2></div>
            <p className="mt-6 max-w-md text-mute">Flat per workspace, up to 5 seats. Annual is $290, two months free.</p>
          </div>
          <div className="md:text-right">
            <Button href="/pricing" variant="ghost">See what is included</Button>
          </div>
        </div>
      </Section>

      <Section>
        <Label>FAQ</Label>
        <div className="mb-10 mt-4"><H2>Questions, answered.</H2></div>
        <Faq items={faq} />
      </Section>

      <FinalCta />
    </>
  );
}
