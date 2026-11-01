import Link from "next/link";
import { accountStatus, TRIAL_DAYS } from "@/lib/account";
import type { Workspace } from "@/lib/workspace";

/**
 * Props: ws = { plan_status, trial_end }
 * <DaysLeftBar>   full-width strip under the top bar on every /app page, tone follows urgency.
 * <DaysLeftMeter> larger card with a 7-segment trial tracker, used on the billing page.
 */
type Props = { ws: Pick<Workspace, "plan_status" | "trial_end"> };

const toneBar = {
  calm: "bg-panel text-paper",
  warn: "bg-paper/10 text-paper",
  urgent: "bg-paper text-ink",
} as const;

export function DaysLeftBar({ ws }: Props) {
  const s = accountStatus(ws);
  if (s.state === "active") return null;
  const urgent = s.tone === "urgent";
  return (
    <div
      role="status"
      className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3 md:px-8 ${toneBar[s.tone]}`}
    >
      <p className="flex items-center gap-3 text-sm">
        <span className="rounded-full border border-current px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-widest">
          {s.pill}
        </span>
        <span className="hidden sm:inline">{s.message}</span>
      </p>
      {s.cta && (
        <Link
          href={s.cta.href}
          className={`inline-flex min-h-[44px] items-center font-mono text-[11px] uppercase tracking-widest underline underline-offset-4 ${
            urgent ? "" : "text-mute hover:text-paper"
          }`}
        >
          {s.cta.label}
        </Link>
      )}
    </div>
  );
}

export function DaysLeftMeter({ ws }: Props) {
  const s = accountStatus(ws);
  if (s.daysLeft === null) return null;
  const dayNumber = Math.min(TRIAL_DAYS, Math.max(1, TRIAL_DAYS - s.daysLeft + 1));
  return (
    <div className="rounded-2xl border border-line bg-panel p-5 md:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-mute">Trial</p>
          <p className="mt-2 text-5xl font-semibold tracking-tight md:text-6xl">{s.daysLeft}</p>
          <p className="mt-1 text-sm text-mute">{s.daysLeft === 1 ? "day" : "days"} left</p>
        </div>
        <p className="pb-1 font-mono text-[11px] uppercase tracking-widest text-mute">
          Day {dayNumber} of {TRIAL_DAYS}
        </p>
      </div>
      <div className="mt-6 grid grid-cols-7 gap-1.5" aria-hidden="true">
        {Array.from({ length: TRIAL_DAYS }, (_, i) => {
          const done = i < TRIAL_DAYS - s.daysLeft!;
          return <span key={i} className={`h-1.5 rounded-full ${done ? "bg-paper" : "bg-line"}`} />;
        })}
      </div>
      <p className="mt-5 text-sm text-mute">{s.message}</p>
    </div>
  );
}
