import { requireWorkspace } from "@/lib/workspace";
import NewAutomationForm from "@/components/automations/NewAutomationForm";
import { createAutomation } from "../actions";

export default async function NewAutomationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireWorkspace();
  const { error } = await searchParams;
  return (
    <main className="bg-black text-paper min-h-screen px-4 py-8 max-w-xl mx-auto">
      <p className="font-mono text-[11px] uppercase tracking-widest text-mute">Automations</p>
      <h1 className="text-2xl font-semibold mt-1 mb-6">New automation</h1>
      <NewAutomationForm action={createAutomation} error={error} />
    </main>
  );
}
