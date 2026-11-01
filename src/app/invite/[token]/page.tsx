import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { safeInvite } from "@/lib/safe-next";

type Invite = { id: string; workspace_id: string; email: string; accepted_at: string | null; expires_at: string | null };

/** Returns why this user cannot accept, or null when they can. */
async function check(token: string, user: { id: string; email?: string }): Promise<{ invite: Invite | null; problem: string | null; workspaceName?: string }> {
  const admin = supabaseAdmin();
  const { data: invite } = await admin
    .from("invites").select("id, workspace_id, email, accepted_at, expires_at").eq("token", token).maybeSingle<Invite>();
  if (!invite || invite.accepted_at) return { invite: null, problem: "This invite link is invalid or has already been used." };
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return { invite: null, problem: "This invite has expired. Ask the workspace owner to send a new one." };
  }
  if ((user.email ?? "").toLowerCase() !== invite.email.toLowerCase()) {
    return { invite: null, problem: `This invite was sent to ${invite.email}. Sign in with that email to accept it.` };
  }
  const { data: existing } = await admin.from("members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (existing?.workspace_id === invite.workspace_id) return { invite, problem: null };
  if (existing) {
    // One workspace per account: joining a second would make which one the app shows ambiguous.
    return { invite: null, problem: "Your account already belongs to a workspace. Sign up with a different email to join this one, or ask the owner to invite another address." };
  }
  const { data: ws } = await admin.from("workspaces").select("name").eq("id", invite.workspace_id).single();
  return { invite, problem: null, workspaceName: ws?.name };
}

async function accept(token: string) {
  "use server";
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/signup?invite=${encodeURIComponent(token)}`);
  const { invite, problem } = await check(token, user);
  if (problem || !invite) redirect(`/invite/${encodeURIComponent(token)}`);

  const admin = supabaseAdmin();
  const { error } = await admin.from("members").upsert(
    { workspace_id: invite.workspace_id, user_id: user.id, role: "member" },
    { onConflict: "workspace_id,user_id", ignoreDuplicates: true }
  );
  // The seat limit is enforced by a database trigger, so a race cannot overfill the workspace.
  if (error) redirect(`/invite/${encodeURIComponent(token)}?error=${error.message.includes("seat") ? "full" : "failed"}`);
  await admin.from("invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
  redirect("/app");
}

export default async function InvitePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token: raw } = await params;
  const { error } = await searchParams;
  const token = safeInvite(raw);
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/signup?invite=${encodeURIComponent(raw)}`);

  let problem: string | null = "This invite link is invalid or has already been used.";
  let workspaceName: string | undefined;
  if (token) ({ problem, workspaceName } = await check(token, user));
  if (!problem && error === "full") problem = "This workspace has no free seats.";
  if (!problem && error === "failed") problem = "Could not accept the invite. Try again.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4 text-paper">
      <div className="w-full max-w-sm border border-line bg-panel p-6">
        <h1 className="text-xl font-semibold">Invite</h1>
        {problem ? (
          <>
            <p className="mt-3 text-sm text-mute">{problem}</p>
            <Link href="/app" className="mt-6 inline-flex min-h-[44px] items-center font-mono text-xs uppercase tracking-widest underline">
              Go to app
            </Link>
          </>
        ) : (
          <form action={accept.bind(null, token!)}>
            <p className="mt-3 text-sm text-mute">Join {workspaceName ? <strong className="text-paper">{workspaceName}</strong> : "this workspace"} on Cubits?</p>
            <button type="submit" className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-paper px-5 text-sm font-medium text-black">
              Accept invite
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
