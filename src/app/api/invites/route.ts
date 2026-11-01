import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspace } from "@/lib/workspace";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const Body = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

function back(req: Request, msg: string) {
  return NextResponse.redirect(new URL(`/app/team?msg=${msg}`, req.url), 303);
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: Request) {
  const { workspace, role, userId } = await requireWorkspace({ allowUnpaid: true });
  if (role !== "owner") return back(req, "forbidden");

  const ct = req.headers.get("content-type") ?? "";
  const raw = ct.includes("application/json")
    ? await req.json().catch(() => ({}))
    : Object.fromEntries(await req.formData().catch(() => new FormData()));
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return back(req, "invalid");
  const email = parsed.data.email;

  const admin = supabaseAdmin();
  const [{ count: memberCount }, { count: inviteCount }] = await Promise.all([
    admin.from("members").select("user_id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
    admin.from("invites").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id).is("accepted_at", null),
  ]);
  if ((memberCount ?? 0) + (inviteCount ?? 0) >= workspace.seats) return back(req, "full");

  const { data: pending } = await admin
    .from("invites").select("id").eq("workspace_id", workspace.id).eq("email", email).is("accepted_at", null).maybeSingle();
  if (pending) return back(req, "exists");

  const { data: invite, error } = await admin
    .from("invites").insert({ workspace_id: workspace.id, email }).select("token").single();
  if (error || !invite) return back(req, "failed");

  const link = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite.token}`;
  try {
    await sendEmail({
      to: email,
      subject: `Join ${workspace.name} on Cubits`,
      html: `<p>You have been invited to join ${esc(workspace.name)} on Cubits.</p><p><a href="${link}">Accept the invite</a></p><p>Or copy this link: ${link}</p>`,
    });
  } catch (e) {
    console.error("invite email failed", userId, e);
    return back(req, "failed");
  }
  return back(req, "sent");
}
