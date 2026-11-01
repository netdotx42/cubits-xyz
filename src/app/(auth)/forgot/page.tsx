"use client";
import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Input } from "@/components/app/Input";
import { Button } from "@/components/app/Button";

export default function ForgotPage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    await supabaseBrowser().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset")}`,
    });
    // Same message whether or not the account exists, so emails cannot be probed.
    setSent(true);
    setBusy(false);
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
      {sent ? (
        <p className="mt-6 text-sm text-mute">If an account exists for that email, a reset link is on its way. Open it in this browser.</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <Input label="Email" name="email" type="email" required autoComplete="email" />
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Sending..." : "Send reset link"}</Button>
        </form>
      )}
      <p className="mt-6 text-sm text-mute"><Link href="/login" className="text-paper underline">Back to log in</Link></p>
    </>
  );
}
