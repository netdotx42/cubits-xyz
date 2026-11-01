import { supabaseServer } from "@/lib/supabase/server";

/** Site-owner check: signed-in email must be listed in ADMIN_EMAILS (comma separated). */
export async function isAdmin() {
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  const allowed = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!user?.email && allowed.includes(user.email.toLowerCase());
}
