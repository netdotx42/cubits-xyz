"use client";
import { SUPPORT_EMAIL } from "@/lib/site";

import { useState } from "react";

const field =
  "min-h-[44px] w-full rounded-lg border border-line bg-black px-4 text-base text-paper outline-none transition-colors duration-200 placeholder:text-mute focus:border-mute";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const subject = encodeURIComponent(`Cubits enquiry from ${String(d.get("name") ?? "")}`);
    const body = encodeURIComponent(`${String(d.get("message") ?? "")}\n\nFrom: ${String(d.get("name") ?? "")} <${String(d.get("email") ?? "")}>`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-line bg-panel p-6">
        <div className="font-mono text-[11px] uppercase tracking-widest text-mute">Sent</div>
        <p className="mt-2 text-lg tracking-tight">Thanks. Your email app should have opened with the message. If not, write to {SUPPORT_EMAIL}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-mute">Name</span>
        <input name="name" required autoComplete="name" className={field} />
      </label>
      <label className="block">
        <span className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-mute">Work email</span>
        <input name="email" type="email" required autoComplete="email" className={field} />
      </label>
      <label className="block">
        <span className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-mute">How can we help?</span>
        <textarea name="message" required rows={5} className={`${field} py-3`} />
      </label>
      <button type="submit" className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-paper px-6 text-sm font-medium text-black transition-colors duration-200 hover:bg-white sm:w-auto">
        Send message
      </button>
    </form>
  );
}
