export type SharePlatform = "x" | "linkedin" | "instagram";

export const HOOK = "Invoices in one tab. Leads in another. Follow-ups in your head.";
export const SUB = "One workspace for all three. $29 a month, flat.";

export const SHARE_TEXT: Record<SharePlatform, string> = {
  x: `${HOOK}\n\nCubits runs all three from one workspace. $29/mo flat, 7-day free trial.`,
  linkedin: `${HOOK}\n\nSmall teams lose hours to tool sprawl. Cubits brings invoicing, lead forms and automations into one workspace. $29 a month flat, with a 7-day free trial.`,
  instagram: `${HOOK}\n\nCubits puts invoicing, lead forms and automations in one workspace. $29 a month flat, 7-day free trial. Link in bio.\n\n#smallbusiness #invoicing #automation #agencylife #productivity`,
};

/** Card dimensions per platform. */
export const CARD_SIZE: Record<SharePlatform, { width: number; height: number }> = {
  x: { width: 1200, height: 675 },
  linkedin: { width: 1200, height: 627 },
  instagram: { width: 1080, height: 1350 },
};

export const PLATFORMS = Object.keys(CARD_SIZE) as SharePlatform[];
