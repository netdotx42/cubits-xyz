"use client";
/**
 * SidebarNav props: workspaceName (string | null), onNavigate (optional callback, used by MobileNav to close).
 * Links come from CUBITS plus Dashboard, Team and Billing. Highlights the active route.
 * Includes the sign-out button.
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CUBITS } from "@/lib/cubits/registry";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SidebarNav({ workspaceName, onNavigate }: { workspaceName: string | null; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/app", label: "Dashboard", icon: "◇" },
    ...CUBITS.map((c) => ({ href: c.route, label: c.name, icon: c.icon })),
    { href: "/app/team", label: "Team", icon: "◎" },
    { href: "/app/billing", label: "Billing", icon: "$" },
    { href: "/app/settings", label: "Settings", icon: "⚙" },
  ];

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-5 py-5">
        <Link href="/app" onClick={onNavigate} className="font-mono text-sm uppercase tracking-widest text-paper">
          Cubits
        </Link>
        {workspaceName && <p className="mt-1 truncate text-xs text-mute">{workspaceName}</p>}
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {links.map((l) => {
          const active = l.href === "/app" ? pathname === "/app" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={onNavigate}
              className={`flex min-h-[44px] items-center gap-3 px-5 font-mono text-xs uppercase tracking-widest transition ${
                active ? "bg-panel text-paper" : "text-mute hover:text-paper"
              }`}
            >
              <span className="w-4 text-center">{l.icon}</span>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line p-3">
        <button
          onClick={signOut}
          className="min-h-[44px] w-full px-2 text-left font-mono text-xs uppercase tracking-widest text-mute hover:text-paper"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
