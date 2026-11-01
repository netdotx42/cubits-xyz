"use server";
import { z } from "zod";
import { requireWorkspace } from "@/lib/workspace";
import { supabaseServer } from "@/lib/supabase/server";

const FormInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Form name is required").max(120),
  notify_email: z.string().trim().email("Invalid notify email").or(z.literal("")).optional(),
  fields: z
    .array(
      z.object({
        label: z.string().trim().min(1, "Every field needs a label").max(120),
        type: z.enum(["text", "email", "textarea", "select", "phone"]),
        required: z.boolean(),
        options: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
      })
    )
    .min(1, "Add at least one field")
    .max(30),
});
export type FormInputType = z.infer<typeof FormInput>;
export type FormResult = { ok: true; id: string } | { ok: false; error: string };

export async function saveForm(raw: FormInputType): Promise<FormResult> {
  const { workspace } = await requireWorkspace();
  const parsed = FormInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const v = parsed.data;
  const used = new Set<string>();
  const fields = v.fields.map((f, i) => {
    let base = f.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `field_${i + 1}`;
    if (base === "website") base = "website_field"; // reserved for the honeypot
    let name = base;
    let n = 2;
    while (used.has(name)) name = `${base}_${n++}`;
    used.add(name);
    return {
      name,
      label: f.label,
      type: f.type,
      required: f.required,
      ...(f.type === "select" ? { options: f.options ?? [] } : {}),
    };
  });
  const supabase = await supabaseServer();
  const row = { name: v.name, notify_email: v.notify_email || null, fields };
  if (v.id) {
    const { error } = await supabase.from("forms").update(row).eq("id", v.id).eq("workspace_id", workspace.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: v.id };
  }
  const { data, error } = await supabase.from("forms").insert({ ...row, workspace_id: workspace.id }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not create" };
  return { ok: true, id: data.id };
}

export async function deleteForm(id: string): Promise<FormResult> {
  const { workspace } = await requireWorkspace();
  const supabase = await supabaseServer();
  const { error } = await supabase.from("forms").delete().eq("id", id).eq("workspace_id", workspace.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, id };
}
