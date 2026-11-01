import { requireWorkspace } from "@/lib/workspace";
import { supabaseAdmin } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/app/Card";
import { Button } from "@/components/app/Button";
import { DaysLeftMeter } from "@/components/app/DaysLeft";

const LABELS: Record<string, string> = {
  none: "No plan",
  trialing: "Free trial",
  active: "Active",
  past_due: "Payment failed",
  canceled: "Canceled",
};

export default async function BillingPage() {
  const { workspace, role } = await requireWorkspace({ allowUnpaid: true });
  const { data } = await supabaseAdmin().from("workspaces").select("stripe_customer_id").eq("id", workspace.id).single();
  const hasCustomer = Boolean(data?.stripe_customer_id);
  const subscribed = workspace.plan_status === "trialing" || workspace.plan_status === "active" || workspace.plan_status === "past_due";

  return (
    <>
      <PageHeader title="Billing" subtitle="One plan. One price per workspace." />
      {workspace.plan_status === "trialing" && (
        <div className="mb-4"><DaysLeftMeter ws={workspace} /></div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-widest text-mute">Plan</p>
          <p className="mt-2 text-3xl font-semibold">$29<span className="text-base font-normal text-mute"> / month</span></p>
          <ul className="mt-4 space-y-2 text-sm text-mute">
            <li>Flat price for the whole workspace.</li>
            <li>Or $290 a year: two months free.</li>
            <li>7 days free. Card required, cancel any time.</li>
            <li>Up to 5 seats.</li>
            <li>All tools included.</li>
          </ul>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-widest text-mute">Status</p>
          <p className="mt-2 text-xl">{LABELS[workspace.plan_status] ?? workspace.plan_status}</p>
          {workspace.plan_status === "trialing" && workspace.trial_end && (
            <p className="mt-1 text-sm text-mute">Trial ends {new Date(workspace.trial_end).toLocaleDateString("en-US")}.</p>
          )}
          {workspace.plan_status === "past_due" && (
            <p className="mt-1 text-sm text-red-400">Your last payment failed. Update your card in billing.</p>
          )}
          <div className="mt-6 space-y-3">
            {role !== "owner" ? (
              <p className="text-sm text-mute">Only the workspace owner can manage billing.</p>
            ) : (
              <>
                {!subscribed && (
                  <form action="/api/stripe/checkout" method="post" className="space-y-3">
                    <Button type="submit" name="interval" value="monthly" className="w-full">
                      Start 7-day free trial · $29 / month
                    </Button>
                    {process.env.STRIPE_PRICE_ID_ANNUAL && (
                      <Button type="submit" name="interval" value="annual" variant="ghost" className="w-full">
                        Annual · $290 / year (2 months free)
                      </Button>
                    )}
                  </form>
                )}
                {hasCustomer && (
                  <form action="/api/stripe/portal" method="post">
                    <Button type="submit" variant="ghost" className="w-full">Manage billing</Button>
                  </form>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
      {role === "owner" && (
        <div className="mt-4">
          <Card>
            <p className="font-mono text-[11px] uppercase tracking-widest text-mute">Your data</p>
            <p className="mt-2 text-sm text-mute">Export everything in your workspace any time, even if your plan lapses.</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {[
                ["/api/export", "Everything (JSON)"],
                ["/api/export?type=invoices&format=csv", "Invoices (CSV)"],
                ["/api/export?type=submissions&format=csv", "Form submissions (CSV)"],
              ].map(([href, label]) => (
                <a key={href} href={href} className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-line px-5 text-sm transition-colors hover:border-paper hover:bg-panel">
                  {label}
                </a>
              ))}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
