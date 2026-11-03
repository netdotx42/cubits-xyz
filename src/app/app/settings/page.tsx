import { requireWorkspace } from "@/lib/workspace";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/app/Card";
import { Input } from "@/components/app/Input";
import { Button } from "@/components/app/Button";
import { deleteWorkspace, saveSettings } from "./actions";

const MESSAGES: Record<string, string> = {
  saved: "Settings saved.",
  forbidden: "Only the workspace owner can change settings.",
};

const textarea =
  "min-h-[96px] w-full border border-line bg-ink px-3 py-2 text-base text-paper outline-none placeholder:text-mute focus:border-mute";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const { workspace, role } = await requireWorkspace({ allowUnpaid: true });
  const { msg, error } = await searchParams;
  const owner = role === "owner";

  return (
    <>
      <PageHeader title="Settings" subtitle="Workspace details shown on your invoices and quotes." />
      {msg && MESSAGES[msg] && <div className="mb-6 border border-line bg-panel p-4 text-sm">{MESSAGES[msg]}</div>}
      {error && <div className="mb-6 border border-line bg-panel p-4 text-sm text-red-400">{error.slice(0, 200)}</div>}

      <Card className="mb-4">
        <form action={saveSettings} className="space-y-5">
          <fieldset disabled={!owner} className="space-y-5">
            <Input label="Workspace name" name="name" required maxLength={100} defaultValue={workspace.name} />
            <label className="block">
              <span className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-mute">Company details (address, VAT or tax ID)</span>
              <textarea name="company_details" maxLength={1000} defaultValue={workspace.company_details ?? ""} className={textarea} />
            </label>
            <Input label="Currency (ISO code)" name="currency" required maxLength={3} defaultValue={workspace.currency} />
            <Input label="Logo URL (https)" name="logo_url" type="url" maxLength={500} defaultValue={workspace.logo_url ?? ""} placeholder="https://..." />
          </fieldset>
          {owner ? <Button type="submit">Save settings</Button> : <p className="text-sm text-mute">Only the workspace owner can change settings.</p>}
        </form>
      </Card>

      {owner && (
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-widest text-mute">Delete workspace</p>
          <p className="mt-2 text-sm text-mute">
            Cancels your subscriptions immediately and permanently deletes every invoice, form, submission, automation and agent.
            Export your data from Billing first. This cannot be undone.
          </p>
          <form action={deleteWorkspace} className="mt-4 space-y-4">
            <Input label={`Type "${workspace.name}" to confirm`} name="confirm" required autoComplete="off" />
            <Button type="submit" variant="ghost">Delete workspace</Button>
          </form>
        </Card>
      )}
    </>
  );
}
