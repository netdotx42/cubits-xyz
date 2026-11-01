import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { emit } from "@/lib/events";
import { escapeHtml } from "@/components/cubits/util";
import type { FormField } from "@/components/cubits/forms";
import { allow, clientIp } from "@/lib/rate-limit";
import { workspacePlan } from "@/lib/access";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9]{6,64}$/i.test(slug)) return json({ error: "Form not found" }, 404);
  // Shared across server instances: 10 per minute per IP and form, 300 per hour per form.
  const ip = clientIp(req);
  const ok = (await allow(`form:${slug}:${ip}`, 10, 60)) && (await allow(`form:${slug}`, 300, 3600));
  if (!ok) return json({ error: "Too many submissions. Try again shortly." }, 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid request" }, 400);
  const input = body as Record<string, unknown>;

  // Honeypot: pretend success.
  if (typeof input.website === "string" && input.website.trim() !== "") return json({ ok: true });

  const admin = supabaseAdmin();
  const { data: form } = await admin.from("forms").select("id, workspace_id, name, fields, notify_email").eq("slug", slug).maybeSingle();
  if (!form) return json({ error: "Form not found" }, 404);
  // Forms are part of the Cubits plan: a lapsed workspace stops accepting submissions.
  const plan = await workspacePlan(form.workspace_id);
  if (!plan?.cubits) return json({ error: "This form is not accepting submissions right now." }, 403);

  const fields = (form.fields ?? []) as FormField[];
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    let s: z.ZodTypeAny = z.string().trim().max(f.type === "textarea" ? 5000 : 500);
    if (f.type === "email") s = z.string().trim().max(320).email(`${f.label} must be a valid email`).or(z.literal(""));
    if (f.type === "select") {
      const opts = f.options ?? [];
      s = z.string().refine((v) => v === "" || opts.includes(v), `${f.label} has an invalid choice`);
    }
    if (f.required) s = (s as z.ZodString).refine((v: string) => v.trim().length > 0, `${f.label} is required`);
    else s = z.preprocess((v) => (v == null ? "" : v), s);
    shape[f.name] = s;
  }
  const parsed = z.object(shape).safeParse(
    Object.fromEntries(fields.map((f) => [f.name, typeof input[f.name] === "string" ? input[f.name] : f.required ? undefined : ""]))
  );
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid submission" }, 400);
  const data = parsed.data as Record<string, string>;

  const { error } = await admin.from("submissions").insert({ form_id: form.id, workspace_id: form.workspace_id, data });
  if (error) return json({ error: "Could not save submission" }, 500);

  if (form.notify_email) {
    const rows = fields
      .map((f) => `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${escapeHtml(f.label)}</td><td style="padding:4px 0;white-space:pre-wrap">${escapeHtml(data[f.name])}</td></tr>`)
      .join("");
    try {
      await sendEmail({
        to: form.notify_email,
        subject: `New submission: ${form.name}`,
        html: `<div style="font-family:Arial,sans-serif"><h3>New submission for ${escapeHtml(form.name)}</h3><table>${rows}</table></div>`,
      });
    } catch (e) {
      console.error("notify email failed", e);
    }
  }

  await emit(form.workspace_id, "form.submitted", { form_id: form.id, form_name: form.name, data });
  return json({ ok: true });
}
