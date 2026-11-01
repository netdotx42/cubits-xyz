/**
 * Shared event contract. Every cubit calls emit() after something happens.
 * The automations engine (src/lib/automations/engine.ts) owns what runs.
 */
export type CubitEvent =
  | "form.submitted"
  | "invoice.created"
  | "invoice.sent"
  | "invoice.paid";

export type EventPayload = Record<string, unknown>;

export async function emit(workspaceId: string, event: CubitEvent, payload: EventPayload) {
  try {
    const { runAutomations } = await import("@/lib/automations/engine");
    await runAutomations(workspaceId, event, payload);
  } catch (err) {
    // Never let an automation failure break the cubit that emitted the event.
    console.error("emit failed", event, err);
  }
}
