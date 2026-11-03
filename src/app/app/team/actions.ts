"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Owner only. Removes a member (never the owner). */
export async function removeMember(userId: string) {
  const { workspace, role, userId: me } = await requireWorkspace({ allowUnpaid: true });
  if (role !== "owner") redirect("/app/team?msg=forbidden");
  if (userId === me || userId === workspace.owner_id) redirect("/app/team?msg=owner");
  await supabaseAdmin().from("members").delete().eq("workspace_id", workspace.id).eq("user_id", userId).neq("role", "owner");
  revalidatePath("/app/team");
  redirect("/app/team?msg=removed");
}

/** Owner only. Deletes a pending invite so its link stops working and its seat frees up. */
export async function revokeInvite(inviteId: string) {
  const { workspace, role } = await requireWorkspace({ allowUnpaid: true });
  if (role !== "owner") redirect("/app/team?msg=forbidden");
  await supabaseAdmin().from("invites").delete().eq("workspace_id", workspace.id).eq("id", inviteId).is("accepted_at", null);
  revalidatePath("/app/team");
  redirect("/app/team?msg=revoked");
}
