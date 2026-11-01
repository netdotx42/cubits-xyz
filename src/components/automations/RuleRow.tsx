import { deleteAutomation, toggleAutomation } from "@/app/app/automations/actions";
import { ACTION_LABELS, TRIGGER_LABELS, isAction, isTrigger } from "@/lib/automations/types";

export type Rule = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  last?: { status: string; created_at: string } | null;
};

const btn = "min-h-[44px] min-w-[44px] px-4 rounded-full border border-line text-sm text-paper hover:border-paper";

export default function RuleRow({ rule }: { rule: Rule }) {
  const t = isTrigger(rule.trigger) ? TRIGGER_LABELS[rule.trigger] : rule.trigger;
  const a = isAction(rule.action) ? ACTION_LABELS[rule.action] : rule.action;
  return (
    <li className="border border-line rounded-xl p-4 space-y-3">
      <div className="min-w-0">
        <p className="font-medium text-paper break-words">{rule.name}</p>
        <p className="mt-1 text-sm text-mute break-words">{t} then {a}</p>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-mute">
          {rule.last ? `Last run: ${rule.last.status} ${new Date(rule.last.created_at).toISOString().slice(0, 16).replace("T", " ")} UTC` : "Never run"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <form action={toggleAutomation.bind(null, rule.id, !rule.enabled)}>
          <button type="submit" className={btn} aria-pressed={rule.enabled}>
            {rule.enabled ? "On" : "Off"}
          </button>
        </form>
        <form action={deleteAutomation.bind(null, rule.id)}>
          <button type="submit" className={btn}>Delete</button>
        </form>
      </div>
    </li>
  );
}
