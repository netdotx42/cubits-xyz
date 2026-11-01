"use server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export async function markRead(id: string) {
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  const allowed = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!user?.email || !allowed.includes(user.email.toLowerCase())) return;
  await supabaseAdmin().from("contact_messages").update({ read_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/app/admin/messages");
}
