"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Input } from "@/components/app/Input";
import { Button } from "@/components/app/Button";

export default function ResetPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== String(form.get("confirm"))) return setError("Passwords do not match.");
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    if (error) {
      setError(error.message.includes("session") ? "This reset link expired. Request a new one." : error.message);
      setBusy(false);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <Input label="New password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <Input label="Confirm password" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Saving..." : "Update password"}</Button>
      </form>
    </>
  );
}
