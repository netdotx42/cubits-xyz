export type CubitDef = {
  id: string;
  name: string;
  tagline: string;
  route: string; // app route, under /app
  icon: string;  // single glyph, no icon library needed
};

export const CUBITS: CubitDef[] = [
  { id: "invoices", name: "Invoices", tagline: "Branded invoices and quotes, sent in a click.", route: "/app/invoices", icon: "▤" },
  { id: "forms", name: "Forms", tagline: "Embeddable lead forms that land in your inbox.", route: "/app/forms", icon: "◧" },
  { id: "automations", name: "Automations", tagline: "When this happens, do that. No code.", route: "/app/automations", icon: "↯" },
];
