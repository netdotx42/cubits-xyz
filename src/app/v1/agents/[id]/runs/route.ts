import { z } from "zod";
import { authenticate, json } from "@/lib/agents/keys";
import { RunError, startRun } from "@/lib/agents/runner";

export const runtime = "nodejs";
export const maxDuration = 60;

const body = z.object({ input: z.string().min(1).max(8000) });

/** POST /v1/agents/{id}/runs. Header Idempotency-Key makes retries safe. Add ?stream=1 for SSE. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Body must be { input: string }." }, 400);
  const args = {
    workspaceId: auth.workspaceId, agentId: id, input: parsed.data.input, source: "api" as const,
    idempotencyKey: req.headers.get("idempotency-key")?.slice(0, 100) ?? null,
  };

  if (new URL(req.url).searchParams.get("stream") === "1") {
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      async start(ctrl) {
        const send = (event: string, data: unknown) => ctrl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        try {
          const { run } = await startRun({ ...args, onEvent: send });
          send("run", run);
        } catch (e) {
          send("error", { error: e instanceof Error ? e.message : "Run failed" });
        }
        ctrl.close();
      },
    });
    return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-store" } });
  }

  try {
    const { run, replay } = await startRun(args);
    return json(run, replay ? 200 : 201);
  } catch (e) {
    if (e instanceof RunError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: "Run failed." }, 500);
  }
}
