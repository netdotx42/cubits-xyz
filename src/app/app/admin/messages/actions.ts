"use server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export async function markRead(id: string) {
  if (!(await isAdmin())) return;
  await supabaseAdmin().from("contact_messages").update({ read_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/app/admin/messages");
}
