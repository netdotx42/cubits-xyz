import Link from "next/link";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";
import { CUBITS } from "@/lib/cubits/registry";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/app/Card";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  // After checkout the webhook can lag a few seconds, so let the welcome view render unpaid.
  const { workspace } = await requireWorkspace({ allowUnpaid: true });
  const cubitsOn = workspace.plan_status === "trialing" || workspace.plan_status === "active";
  const agentsOn = workspace.agents_status === "trialing" || workspace.agents_status === "active";
  if (!cubitsOn && !agentsOn && welcome !== "1") redirect("/app/billing");
  const visible = cubitsOn ? CUBITS : CUBITS.filter((c) => c.id === "agents");

  return (
    <>
      <PageHeader title={workspace.name} subtitle="Your tools." />
      {welcome && (
        <div className="mb-6 border border-line bg-panel p-4 text-sm">
          Your 7-day free trial has started. Pick a tool below.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((c) => (
          <Link key={c.id} href={c.route} className="block min-h-[44px]">
            <Card className="h-full transition hover:border-mute">
              <div className="mb-4 font-mono text-2xl">{c.icon}</div>
              <h2 className="font-mono text-xs uppercase tracking-widest">{c.name}</h2>
              <p className="mt-2 text-sm text-mute">{c.tagline}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
