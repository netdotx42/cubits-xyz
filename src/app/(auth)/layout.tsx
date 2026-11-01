import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-ink px-4 py-8">
      <Link href="/" className="font-mono text-sm uppercase tracking-widest text-paper">Cubits</Link>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
    </main>
  );
}
