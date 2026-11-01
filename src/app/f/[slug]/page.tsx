import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import PublicForm from "./PublicForm";
import type { FormField } from "@/components/cubits/forms";

export const dynamic = "force-dynamic";

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: form } = await supabaseAdmin().from("forms").select("name, slug, fields").eq("slug", slug).maybeSingle();
  if (!form) notFound();
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="mb-6 break-words text-xl font-semibold">{form.name}</h1>
      <PublicForm slug={form.slug} fields={(form.fields ?? []) as FormField[]} />
    </main>
  );
}
