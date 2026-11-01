import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/signup?invite=${encodeURIComponent(token)}`);

  const admin = supabaseAdmin();
  const { data: invite } = await admin
    .from("invites").select("id, workspace_id, email, accepted_at").eq("token", token).maybeSingle();

  let problem: string | null = null;
  if (!invite || invite.accepted_at) {
    problem = "This invite link is invalid or has already been used.";
  } else if ((user.email ?? "").toLowerCase() !== invite.email.toLowerCase()) {
    problem = `This invite was sent to ${invite.email}. Sign in with that email to accept it.`;
  } else {
    const [{ data: ws }, { count }] = await Promise.all([
      admin.from("workspaces").select("seats").eq("id", invite.workspace_id).single(),
      admin.from("members").select("user_id", { count: "exact", head: true }).eq("workspace_id", invite.workspace_id),
    ]);
    if (!ws || (count ?? 0) >= ws.seats) {
      problem = "This workspace has no free seats.";
    } else {
      await admin.from("members").upsert(
        { workspace_id: invite.workspace_id, user_id: user.id, role: "member" },
        { onConflict: "workspace_id,user_id", ignoreDuplicates: true }
      );
      await admin.from("invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
      redirect("/app");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4 text-paper">
      <div className="w-full max-w-sm border border-line bg-panel p-6">
        <h1 className="text-xl font-semibold">Invite</h1>
        <p className="mt-3 text-sm text-mute">{problem}</p>
        <Link href="/app" className="mt-6 inline-flex min-h-[44px] items-center font-mono text-xs uppercase tracking-widest underline">
          Go to app
        </Link>
      </div>
    </main>
  );
}
