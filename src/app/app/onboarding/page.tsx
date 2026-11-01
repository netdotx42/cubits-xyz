import { redirect } from "next/navigation";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/app/Card";
import { Input } from "@/components/app/Input";
import { Button } from "@/components/app/Button";

async function createWorkspace(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 100) redirect("/app/onboarding?error=name");

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (existing) redirect("/app");

  const { data: ws, error } = await admin.from("workspaces").insert({ name, owner_id: user.id }).select("id").single();
  if (error || !ws) redirect("/app/onboarding?error=create");
  const { error: mErr } = await admin.from("members").insert({ workspace_id: ws.id, user_id: user.id, role: "owner" });
  if (mErr) redirect("/app/onboarding?error=create");

  if (user.email) {
    try {
      await sendEmail({
        to: user.email,
        subject: "Welcome to Cubits",
        html: `<p>Welcome to Cubits.</p><p>Your workspace "${escapeHtml(name)}" is ready. Start your 7-day free trial to unlock invoices, forms and automations.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/app/billing">Start your free trial</a></p>`,
      });
    } catch (e) {
      console.error("welcome email failed", e);
    }
  }
  redirect("/app/billing");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: existing } = await supabase.from("members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (existing) redirect("/app");

  const { error } = await searchParams;
  const company = (user.user_metadata?.company as string | undefined) ?? "";

  return (
    <div className="max-w-md">
      <PageHeader title="Create your workspace" subtitle="One workspace per company. Your team shares it." />
      <Card>
        <form action={createWorkspace} className="space-y-5">
          <Input label="Company name" name="name" required maxLength={100} defaultValue={company} />
          {error && <p className="text-sm text-red-400">Could not create the workspace. Check the name and try again.</p>}
          <Button type="submit" className="w-full">Create workspace</Button>
        </form>
      </Card>
    </div>
  );
}
