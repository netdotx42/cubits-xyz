import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";
import { supabaseServer } from "@/lib/supabase/server";
import FormBuilder from "../../FormBuilder";
import type { FormField } from "@/components/cubits/forms";

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireWorkspace();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await supabaseServer();
  const { data: form } = await supabase.from("forms").select("*").eq("id", id).eq("workspace_id", workspace.id).maybeSingle();
  if (!form) notFound();
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Edit form</h1>
      <FormBuilder
        initial={{
          id: form.id,
          name: form.name,
          notify_email: form.notify_email ?? "",
          fields: ((form.fields ?? []) as FormField[]).map((x) => ({
            label: x.label,
            type: x.type,
            required: !!x.required,
            optionsText: (x.options ?? []).join("\n"),
          })),
        }}
      />
    </div>
  );
}
