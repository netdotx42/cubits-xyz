"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";
import { supabaseServer } from "@/lib/supabase/server";
import { assertSafeUrl } from "@/lib/automations/actions";
import { CONFIG_SCHEMAS, isAction, isTrigger } from "@/lib/automations/types";

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function toggleAutomation(id: string, enabled: boolean): Promise<void> {
  const { workspace } = await requireWorkspace();
  const supabase = await supabaseServer();
  await supabase.from("automations").update({ enabled }).eq("id", id).eq("workspace_id", workspace.id);
  revalidatePath("/app/automations");
}

export async function deleteAutomation(id: string): Promise<void> {
  const { workspace } = await requireWorkspace();
  const supabase = await supabaseServer();
  await supabase.from("automations").delete().eq("id", id).eq("workspace_id", workspace.id);
  revalidatePath("/app/automations");
}

function fail(msg: string): never {
  redirect(`/app/automations/new?error=${encodeURIComponent(msg)}`);
}

export async function createAutomation(formData: FormData): Promise<void> {
  const { workspace } = await requireWorkspace();
  const name = str(formData, "name");
  const trigger = str(formData, "trigger");
  const action = str(formData, "action");
  if (!name || name.length > 120) fail("Name is required (max 120 characters).");
  if (!isTrigger(trigger)) fail("Choose a trigger.");
  if (!isAction(action)) fail("Choose an action.");
  if (action === "create_invoice_draft" && trigger !== "form.submitted") {
    fail("Draft invoices can only be created from a form submission.");
  }

  let config: Record<string, unknown> = {};
  if (action === "email") {
    config = { to: str(formData, "email_to"), subject: str(formData, "email_subject"), body: str(formData, "email_body") };
  } else if (action === "slack") {
    config = { webhook_url: str(formData, "slack_url") };
    const m = str(formData, "slack_message");
    if (m) config.message = m;
  } else if (action === "webhook") {
    config = { url: str(formData, "webhook_url") };
  }

  const parsed = CONFIG_SCHEMAS[action].safeParse(config);
  if (!parsed.success) fail("Check the action settings: " + parsed.error.issues[0]?.message);
  try {
    if (action === "slack") assertSafeUrl(config.webhook_url as string);
    if (action === "webhook") assertSafeUrl(config.url as string);
  } catch (e) {
    fail(e instanceof Error ? e.message : "Invalid URL");
  }

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("automations")
    .insert({ workspace_id: workspace.id, name, trigger, action, config, enabled: true });
  if (error) fail("Could not save the automation.");
  revalidatePath("/app/automations");
  redirect("/app/automations");
}
