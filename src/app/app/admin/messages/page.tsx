import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/app/Card";
import { btnGhost, fmtDate } from "@/components/cubits/util";
import { markRead } from "./actions";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  if (!(await isAdmin())) notFound();
  const { data } = await supabaseAdmin().from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200);
  const unread = (data ?? []).filter((m) => !m.read_at).length;

  return (
    <>
      <PageHeader title="Messages" subtitle={`${unread} unread · from the Contact page`} />
      {(data ?? []).length === 0 ? <p className="text-sm text-mute">No messages yet.</p> : (
        <div className="space-y-3">
          {(data ?? []).map((m) => (
            <Card key={m.id} className={m.read_at ? "opacity-60" : ""}>
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-widest text-mute">
                <span>{m.name} · {m.email}</span><span>{fmtDate(m.created_at)}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm">{m.message}</p>
              {!m.read_at && (
                <form action={markRead.bind(null, m.id)} className="mt-3"><button className={btnGhost}>Mark read</button></form>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
