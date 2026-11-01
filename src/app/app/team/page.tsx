import { requireWorkspace } from "@/lib/workspace";
import { supabaseAdmin } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/app/Card";
import { Input } from "@/components/app/Input";
import { Button } from "@/components/app/Button";

const MESSAGES: Record<string, string> = {
  sent: "Invite sent.",
  invalid: "Enter a valid email address.",
  full: "Seat limit reached. Remove an invite or member first.",
  forbidden: "Only the owner can invite people.",
  exists: "That person is already in this workspace.",
  failed: "Could not send the invite. Try again.",
};

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { workspace, role } = await requireWorkspace({ allowUnpaid: true });
  const { msg } = await searchParams;
  const admin = supabaseAdmin();

  const [{ data: members }, { data: invites }] = await Promise.all([
    admin.from("members").select("user_id, role, created_at").eq("workspace_id", workspace.id).order("created_at"),
    admin.from("invites").select("id, email, created_at").eq("workspace_id", workspace.id).is("accepted_at", null).order("created_at"),
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
              <span className="shrink-0 font-mono text-[11px] uppercase tracking-widest text-mute">{m.role}</span>
            </li>
          ))}
        </ul>
      </Card>

      {(invites?.length ?? 0) > 0 && (
        <Card className="mb-4">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-mute">Pending invites</p>
          <ul className="divide-y divide-line">
            {invites!.map((i) => (
              <li key={i.id} className="py-3 text-sm"><span className="block truncate">{i.email}</span></li>
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
