"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Input } from "@/components/app/Input";
import { Button } from "@/components/app/Button";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const invite = params.get("invite");
  const agents = params.get("plan") === "agents";
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const company = String(form.get("company")).trim();
    const next = invite ? `/invite/${invite}` : agents ? "/app/onboarding?plan=agents" : "/app/onboarding";
    const { data, error } = await supabaseBrowser().auth.signUp({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
      options: {
        data: { company },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    if (!data.session) {
      setNotice("Check your email and click the confirmation link to continue.");
      setBusy(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-2 text-sm text-mute">{agents ? "Cubits Agents: 7 days free, then $499 a year." : "7 days free. Then $29/month per workspace."}</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <Input label="Company name" name="company" required autoComplete="organization" />
        <Input label="Work email" name="email" type="email" required autoComplete="email" />
        <Input label="Password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        {notice && <p className="text-sm text-paper">{notice}</p>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Creating..." : "Create account"}</Button>
      </form>
      <p className="mt-6 text-sm text-mute">
        Already have an account?{" "}
        <Link href={invite ? `/login?invite=${invite}` : "/login"} className="text-paper underline">Log in</Link>
      </p>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
