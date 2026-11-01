import type { ReactNode } from "react";
import { supabaseServer } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/app/Sidebar";
import { MobileNav } from "@/components/app/MobileNav";
import { DaysLeftBar } from "@/components/app/DaysLeft";
import type { Workspace } from "@/lib/workspace";

type Ws = { name: string; plan_status: string; trial_end: string | null };

async function loadWorkspace(): Promise<Ws | null> {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("members")
      .select("workspaces(name, plan_status, trial_end)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    return (data?.workspaces as unknown as Ws | null) ?? null;
  } catch {
    return null;
  }
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ws = await loadWorkspace();

  return (
    <div className="min-h-screen bg-ink text-paper md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-line md:block">
        <SidebarNav workspaceName={ws?.name ?? null} />
      </aside>
      <div className="min-w-0 flex-1">
        <MobileNav workspaceName={ws?.name ?? null} />
        {ws && <DaysLeftBar ws={ws as Pick<Workspace, "plan_status" | "trial_end">} />}
        <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
