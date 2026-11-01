"use client";
import { useState } from "react";

const field =
  "min-h-[44px] w-full rounded-lg border border-line bg-black px-4 text-base text-paper outline-none transition-colors duration-200 placeholder:text-mute focus:border-mute";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const d = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: d.get("name"), email: d.get("email"), message: d.get("message"), website: d.get("website"),
        }),
      });
      if (res.ok) setSent(true);
      else setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Could not send. Try again.");
    } catch {
      setError("Network error. Try again.");
    }
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-line bg-panel p-6">
        <div className="font-mono text-[11px] uppercase tracking-widest text-mute">Sent</div>
        <p className="mt-2 text-lg tracking-tight">Thanks. We have your message and will reply to the email you gave.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-mute">Name</span>
        <input name="name" required maxLength={100} autoComplete="name" className={field} />
      </label>
      <label className="block">
        <span className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-mute">Work email</span>
        <input name="email" type="email" required maxLength={254} autoComplete="email" className={field} />
      </label>
      <label className="block">
        <span className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-mute">How can we help?</span>
        <textarea name="message" required minLength={5} maxLength={4000} rows={5} className={`${field} py-3`} />
      </label>
      {/* Honeypot: hidden from people, filled by bots. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={busy} className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-paper px-6 text-sm font-medium text-black transition-colors duration-200 hover:bg-white disabled:opacity-60 sm:w-auto">
        {busy ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
