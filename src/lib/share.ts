export type SharePlatform = "x" | "threads";

export const HOOK = "Invoices in one tab. Leads in another. Follow-ups in your head.";
export const SUB = "One workspace for all three. $29 a month, flat.";

export const SHARE_TEXT: Record<SharePlatform, string> = {
  x: `${HOOK}\n\nCubits runs all three from one workspace. $29/mo flat, 7-day free trial.`,
  threads: `${HOOK}\n\nCubits runs invoicing, lead forms and automations from one workspace. $29/mo flat, 7-day free trial.`,
};

/** Card dimensions per platform. */
export const CARD_SIZE: Record<SharePlatform, { width: number; height: number }> = {
  x: { width: 1200, height: 675 },
  threads: { width: 1080, height: 1350 },
};

export const PLATFORMS = Object.keys(CARD_SIZE) as SharePlatform[];
