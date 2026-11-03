import { requireWorkspace } from "@/lib/workspace";
import { supabaseAdmin } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/app/Card";
import { Input } from "@/components/app/Input";
import { Button } from "@/components/app/Button";
import { removeMember, revokeInvite } from "./actions";

const MESSAGES: Record<string, string> = {
  sent: "Invite sent.",
  invalid: "Enter a valid email address.",
  full: "Seat limit reached. Remove an invite or member first.",
  forbidden: "Only the owner can invite people.",
  exists: "That person is already in this workspace.",
  failed: "Could not send the invite. Try again.",
  removed: "Member removed.",
  revoked: "Invite revoked.",
  owner: "The owner cannot be removed.",
};

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { workspace, role } = await requireWorkspace({ allowUnpaid: true });
  const { msg } = await searchParams;
  const admin = supabaseAdmin();

  const [{ data: members }, { data: invites }] = await Promise.all([
    admin.from("members").select("user_id, role, created_at").eq("workspace_id", workspace.id).order("created_at"),
    admin.from("invites").select("id, email, created_at, expires_at").eq("workspace_id", workspace.id).is("accepted_at", null)
      .gt("expires_at", new Date().toISOString()).order("created_at"),
  ]);

  const rows = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(m.user_id);
      return { ...m, email: data.user?.email ?? "Unknown" };
    })
  );

  const used = rows.length + (invites?.length ?? 0);
  const full = used >= workspace.seats;

  return (
    <>
      <PageHeader title="Team" subtitle={`${used} of ${workspace.seats} seats used.`} />
      {msg && MESSAGES[msg] && <div className="mb-6 border border-line bg-panel p-4 text-sm">{MESSAGES[msg]}</div>}

      <Card className="mb-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-mute">Members</p>
        <ul className="divide-y divide-line">
          {rows.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="min-w-0 truncate">{m.email}</span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="font-mono text-[11px] uppercase tracking-widest text-mute">{m.role}</span>
                {role === "owner" && m.role !== "owner" && (
                  <form action={removeMember.bind(null, m.user_id)}>
                    <button className="min-h-[44px] font-mono text-[11px] uppercase tracking-widest text-mute underline hover:text-paper">Remove</button>
                  </form>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {(invites?.length ?? 0) > 0 && (
        <Card className="mb-4">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-mute">Pending invites</p>
          <ul className="divide-y divide-line">
            {invites!.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0 truncate">{i.email}</span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-[11px] text-mute">expires {new Date(i.expires_at).toLocaleDateString("en-US")}</span>
                  {role === "owner" && (
                    <form action={revokeInvite.bind(null, i.id)}>
                      <button className="min-h-[44px] font-mono text-[11px] uppercase tracking-widest text-mute underline hover:text-paper">Revoke</button>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-mute">Invite a teammate</p>
        {role !== "owner" ? (
          <p className="text-sm text-mute">Only the workspace owner can invite people.</p>
        ) : full ? (
          <p className="text-sm text-mute">All {workspace.seats} seats are used.</p>
        ) : (
          <form action="/api/invites" method="post" className="space-y-4 sm:flex sm:items-end sm:gap-3 sm:space-y-0">
            <div className="flex-1"><Input label="Email" name="email" type="email" required /></div>
            <Button type="submit" className="w-full sm:w-auto">Send invite</Button>
          </form>
        )}
      </Card>
    </>
  );
}
