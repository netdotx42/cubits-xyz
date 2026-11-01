"use client";
/**
 * MobileNav props: workspaceName (string | null). Top bar with hamburger (visible below md)
 * that opens a full-height drawer containing SidebarNav.
 */
import { useState } from "react";
import { SidebarNav } from "./Sidebar";

export function MobileNav({ workspaceName }: { workspaceName: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <header className="flex h-14 items-center justify-between border-b border-line bg-ink px-4">
        <span className="font-mono text-sm uppercase tracking-widest">Cubits</span>
        <button
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="flex h-11 w-11 items-center justify-center text-paper"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 5h16M2 10h16M2 15h16" />
          </svg>
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-64 max-w-[80%] border-r border-line bg-ink">
            <SidebarNav workspaceName={workspaceName} onNavigate={() => setOpen(false)} />
          </div>
          <button aria-label="Close menu" className="flex-1 bg-black/70" onClick={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
