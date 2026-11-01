import type { Metadata } from "next";
import { Label, Section, FinalCta } from "@/components/marketing/ui";
import { InvoiceMock, FormMock, AutomationMock } from "@/components/marketing/Mocks";

export const metadata: Metadata = { title: "The Cubits | Cubits", description: "Invoices, Forms and Automations in depth." };

const tools = [
  {
    id: "invoices", n: "01", name: "Invoices", mock: <InvoiceMock />,
    lead: "Branded invoices and quotes that go out in under a minute and get you paid faster.",
    points: ["Your logo, company details and currency on every document", "Invoices and quotes with automatic numbering", "Email to the client in one click, or print to PDF", "Track draft, sent and paid status"],
    uses: ["A design agency emails a deposit invoice the day a project is agreed.", "A contractor bills a monthly retainer in under a minute."],
  },
  {
    id: "forms", n: "02", name: "Forms", mock: <FormMock />,
    lead: "Lead forms you embed anywhere, wired straight to where your team already looks.",
    points: ["Embed with one snippet or share a link", "Submissions to inbox or Slack", "Text, email, phone, long-text and dropdown fields", "Every submission stored in your workspace"],
    uses: ["A consultancy puts an enquiry form on its site and gets pinged in #leads.", "A studio runs a project brief form before every discovery call."],
  },
  {
    id: "automations", n: "03", name: "Automations", mock: <AutomationMock />,
    lead: "Set the trigger. Pick the action. Remove repeat work for good.",
    points: ["Triggers: form submitted, invoice created, sent or paid, plus daily and weekly schedules", "Actions: email, Slack message, webhook", "About 1,000 runs per workspace per month", "Run history so you can see what fired"],
    uses: ["A paid invoice pings your team in Slack the moment it lands.", "A new lead posts to Slack and triggers a webhook into your CRM."],
  },
];

export default function CubitsPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 md:pt-28">
        <Label>The cubits</Label>
        <h1 className="mt-6 max-w-4xl text-[clamp(2.5rem,9vw,5.5rem)] font-semibold leading-[0.97] tracking-tighter">
          Three tools. <span className="bg-gradient-to-r from-glow-soft via-glow to-white bg-clip-text text-transparent">One engine.</span>
        </h1>
        <p className="mt-5 max-w-lg text-mute">Each does one job brilliantly. Together they power the quote-to-cash loop for a small team.</p>
      </section>

      {tools.map((t, idx) => (
        <Section key={t.id} id={t.id}>
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className={idx % 2 ? "md:order-2" : ""}>
              <Label>{t.n}</Label>
              <h2 className="mt-3 text-[clamp(2rem,6vw,3.75rem)] font-semibold leading-none tracking-tighter">{t.name}</h2>
              <p className="mt-5 max-w-md text-lg text-paper">{t.lead}</p>
              <ul className="mt-6 border-t border-line">
                {t.points.map((p) => (
                  <li key={p} className="flex min-h-[44px] items-center gap-3 border-b border-line py-2 text-sm text-mute">
                    <span aria-hidden className="text-[8px] text-glow">◼</span>{p}
                  </li>
                ))}
              </ul>
              <Label className="mt-8">In practice</Label>
              <ul className="mt-3 space-y-3 text-sm text-mute">
                {t.uses.map((u) => <li key={u}>{u}</li>)}
              </ul>
            </div>
            <div className={idx % 2 ? "md:order-1" : ""}>{t.mock}</div>
          </div>
        </Section>
      ))}

      <FinalCta />
    </>
  );
}
