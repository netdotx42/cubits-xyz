import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/ContactForm";
import { Label, Section } from "@/components/marketing/ui";

export const metadata: Metadata = { title: "Contact | Cubits", description: "Book a demo, ask a question, read our privacy policy and terms." };

export default function Contact() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 md:pt-28">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <Label>Contact</Label>
            <h1 className="mt-6 text-[clamp(2.5rem,9vw,5rem)] font-semibold leading-[0.97] tracking-tighter">Let us power your business. Book a demo or ask anything.</h1>
            <p className="mt-5 max-w-md text-mute">A real person replies, usually within one business day.</p>
            <div className="mt-8 rounded-xl border border-glow/25 bg-panel p-5 shadow-[0_0_40px_-18px_rgba(125,211,252,0.5)]">
              <Label>Your data</Label>
              <p className="mt-2 text-sm">Your data stays yours. Export it any time. A data processing agreement (DPA) is available on request.</p>
            </div>
          </div>
          <ContactForm />
        </div>
      </section>

      <Section id="privacy">
        <Label>Legal</Label>
        <h2 className="mt-3 text-3xl font-semibold tracking-tighter sm:text-4xl">Privacy</h2>
        <div className="mt-6 max-w-2xl space-y-4 text-mute">
          <p>We collect what we need to run your workspace: account details, the content you create in Cubits, and basic usage data to keep the service reliable.</p>
          <p>Your workspace data is yours. We do not sell it and we do not use it for advertising. We use trusted subprocessors for hosting, email delivery and payments.</p>
          <p>You can export or delete your data at any time. For a DPA or any privacy question, send us a message with the form above.</p>
        </div>
      </Section>

      <Section id="terms">
        <Label>Legal</Label>
        <h2 className="mt-3 text-3xl font-semibold tracking-tighter sm:text-4xl">Terms</h2>
        <div className="mt-6 max-w-2xl space-y-4 text-mute">
          <p>Cubits is billed at $29 a month per workspace, or $290 a year. The 7-day free trial requires a card and converts to a paid plan unless cancelled before it ends.</p>
          <p>You can cancel any time. Access continues to the end of the paid period. Automations are limited to about 1,000 runs per workspace per month.</p>
          <p>You are responsible for the content you send through Cubits and for using it lawfully. We may suspend accounts that abuse the service. Questions: use the form above.</p>
        </div>
      </Section>
    </>
  );
}
