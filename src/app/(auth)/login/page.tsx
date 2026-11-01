"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Input } from "@/components/app/Input";
import { Button } from "@/components/app/Button";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const invite = params.get("invite");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const { error } = await supabaseBrowser().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.push(invite ? `/invite/${invite}` : "/app");
    router.refresh();
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <Input label="Email" name="email" type="email" required autoComplete="email" />
        <Input label="Password" name="password" type="password" required autoComplete="current-password" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Logging in..." : "Log in"}</Button>
      </form>
      <p className="mt-6 text-sm text-mute">
        No account?{" "}
        <Link href={invite ? `/signup?invite=${invite}` : "/signup"} className="text-paper underline">Sign up</Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
