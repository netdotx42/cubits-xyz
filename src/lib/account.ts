import type { Workspace } from "@/lib/workspace";

export const TRIAL_DAYS = 7;
const DAY_MS = 86_400_000;

export type AccountState = "trial" | "trial_ending" | "trial_last_day" | "active" | "past_due" | "inactive";

export type AccountStatus = {
  state: AccountState;
  /** Whole days left in the trial (rounded up). null when not trialing. */
  daysLeft: number | null;
  /** 0..1 share of the trial already used. null when not trialing. */
  used: number | null;
  /** Short label for pills, e.g. "5 days left". */
  pill: string;
  /** One line for banners. */
  message: string;
  cta: { label: string; href: string } | null;
  /** Visual urgency: calm | warn | urgent */
  tone: "calm" | "warn" | "urgent";
};

export function accountStatus(
  ws: Pick<Workspace, "plan_status" | "trial_end">,
  now: number = Date.now()
): AccountStatus {
  if (ws.plan_status === "trialing" && ws.trial_end) {
    const msLeft = new Date(ws.trial_end).getTime() - now;
    const daysLeft = Math.max(0, Math.ceil(msLeft / DAY_MS));
    const used = Math.min(1, Math.max(0, 1 - msLeft / (TRIAL_DAYS * DAY_MS)));
    const unit = daysLeft === 1 ? "day" : "days";
    if (daysLeft <= 1) {
      return {
        state: "trial_last_day", daysLeft, used, tone: "urgent",
        pill: daysLeft === 0 ? "Trial ends today" : "1 day left",
        message: "Your trial ends within 24 hours. Your card is charged for your plan when it does. Cancel in Billing to avoid it.",
        cta: { label: "Manage billing", href: "/app/billing" },
      };
    }
    if (daysLeft <= 3) {
      return {
        state: "trial_ending", daysLeft, used, tone: "warn",
        pill: `${daysLeft} ${unit} left`,
        message: `${daysLeft} ${unit} left in your free trial. Your card is charged for your plan when it ends.`,
        cta: { label: "Manage billing", href: "/app/billing" },
      };
    }
    return {
      state: "trial", daysLeft, used, tone: "calm",
      pill: `${daysLeft} ${unit} left`,
      message: `Free trial: ${daysLeft} ${unit} left. Everything is unlocked.`,
      cta: { label: "Billing", href: "/app/billing" },
    };
  }

  if (ws.plan_status === "active") {
    return { state: "active", daysLeft: null, used: null, tone: "calm", pill: "Pro", message: "Your plan is active.", cta: null };
  }
  if (ws.plan_status === "past_due") {
    return {
      state: "past_due", daysLeft: null, used: null, tone: "urgent", pill: "Payment failed",
      message: "Your last payment failed. Update your card to keep access.",
      cta: { label: "Update card", href: "/app/billing" },
    };
  }
  return {
    state: "inactive", daysLeft: null, used: null, tone: "urgent", pill: "No active plan",
    message: ws.plan_status === "canceled"
      ? "Your plan has ended. Resubscribe to unlock Invoices, Forms and Automations again."
      : "Start your 7-day free trial to unlock Invoices, Forms and Automations.",
    cta: { label: ws.plan_status === "canceled" ? "Resubscribe" : "Start free trial", href: "/app/billing" },
  };
}
