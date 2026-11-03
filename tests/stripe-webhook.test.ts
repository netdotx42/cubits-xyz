import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Fakes ───────────────────────────────────────────────────────────
type Call = { table: string; op: "select" | "update"; values?: Record<string, unknown>; filters: [string, string, unknown][] };
const calls: Call[] = [];
let workspaceRow: Record<string, unknown> | null = null;

function query(table: string) {
  const call: Call = { table, op: "select", filters: [] };
  calls.push(call);
  const q = {
    select: () => q,
    update: (values: Record<string, unknown>) => { call.op = "update"; call.values = values; return q; },
    eq: (col: string, v: unknown) => { call.filters.push(["eq", col, v]); return q; },
    is: (col: string, v: unknown) => { call.filters.push(["is", col, v]); return q; },
    maybeSingle: async () => ({ data: workspaceRow, error: null }),
    single: async () => ({ data: workspaceRow, error: null }),
    then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
  };
  return q;
}

const subs = new Map<string, Record<string, unknown>>();
let event: Record<string, unknown>;

vi.mock("@/lib/supabase/server", () => ({ supabaseAdmin: () => ({ from: query }) }));
vi.mock("@/lib/stripe", () => ({
  stripe: () => ({
    webhooks: { constructEvent: () => event },
    subscriptions: {
      retrieve: async (id: string) => {
        const s = subs.get(id);
        if (!s) throw new Error("no such subscription");
        return structuredClone(s);
      },
    },
  }),
}));

const { POST } = await import("@/app/api/stripe/webhook/route");

function sub(id: string, status: string, price: string, metadata: Record<string, string> = { workspace_id: "ws1" }) {
  return { id, status, customer: "cus_1", metadata, trial_end: null, current_period_end: 1_800_000_000, items: { data: [{ price: { id: price } }] } };
}
const request = () => new Request("https://x/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "t" }, body: "{}" });
const updates = () => calls.filter((c) => c.op === "update");

beforeEach(() => {
  calls.length = 0;
  subs.clear();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  process.env.STRIPE_PRICE_ID_AGENTS = "price_agents";
  workspaceRow = { id: "ws1", stripe_subscription_id: null, plan_status: "none", agents_subscription_id: null, agents_status: "none" };
});

describe("stripe webhook", () => {
  it("syncs a new Cubits subscription from Stripe's current state, not the event payload", async () => {
    subs.set("sub_1", sub("sub_1", "active", "price_cubits"));
    event = { type: "customer.subscription.updated", data: { object: sub("sub_1", "trialing", "price_cubits") } };
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(updates()).toHaveLength(1);
    expect(updates()[0].values).toMatchObject({ stripe_subscription_id: "sub_1", plan_status: "active" });
  });

  it("ignores a late event for an old subscription while another one is live (H4)", async () => {
    workspaceRow = { ...workspaceRow, stripe_subscription_id: "sub_new", plan_status: "active" };
    subs.set("sub_old", sub("sub_old", "canceled", "price_cubits"));
    event = { type: "customer.subscription.deleted", data: { object: sub("sub_old", "canceled", "price_cubits") } };
    await POST(request());
    expect(updates()).toHaveLength(0);
  });

  it("keeps Agents subscriptions off the Cubits plan columns", async () => {
    subs.set("sub_ag", sub("sub_ag", "trialing", "price_agents"));
    event = { type: "customer.subscription.created", data: { object: subs.get("sub_ag") } };
    await POST(request());
    expect(updates()[0].values).toMatchObject({ agents_subscription_id: "sub_ag", agents_status: "trialing" });
    expect(updates()[0].values).not.toHaveProperty("plan_status");
  });

  it("marks only the Agents plan past due when the Agents charge fails (H3)", async () => {
    subs.set("sub_ag", sub("sub_ag", "past_due", "price_agents"));
    event = { type: "invoice.payment_failed", data: { object: { subscription: "sub_ag", customer: "cus_1" } } };
    await POST(request());
    expect(updates()).toHaveLength(1);
    expect(updates()[0].values).toEqual({ agents_status: "past_due" });
    expect(updates()[0].filters).toContainEqual(["eq", "agents_subscription_id", "sub_ag"]);
  });

  it("marks the Cubits plan past due only for its own subscription", async () => {
    subs.set("sub_1", sub("sub_1", "past_due", "price_cubits"));
    event = { type: "invoice.payment_failed", data: { object: { subscription: "sub_1", customer: "cus_1" } } };
    await POST(request());
    expect(updates()[0].values).toEqual({ plan_status: "past_due" });
    expect(updates()[0].filters).toContainEqual(["eq", "stripe_subscription_id", "sub_1"]);
  });

  it("rejects requests without a signature", async () => {
    const res = await POST(new Request("https://x", { method: "POST", body: "{}" }));
    expect(res.status).toBe(400);
  });
});
