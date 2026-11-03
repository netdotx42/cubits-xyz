import { afterEach, describe, expect, it } from "vitest";
import { mapStatus, productOf, shouldApply } from "@/lib/billing";

describe("shouldApply", () => {
  it("applies when nothing is stored or it is the same subscription", () => {
    expect(shouldApply(null, "none", "sub_new")).toBe(true);
    expect(shouldApply("sub_a", "active", "sub_a")).toBe(true);
  });
  it("ignores another subscription while the stored one is live", () => {
    for (const status of ["trialing", "active", "past_due"]) expect(shouldApply("sub_live", status, "sub_old")).toBe(false);
  });
  it("lets a new subscription replace a dead one", () => {
    expect(shouldApply("sub_old", "canceled", "sub_new")).toBe(true);
    expect(shouldApply("sub_old", "none", "sub_new")).toBe(true);
  });
});

describe("mapStatus", () => {
  it("maps Stripe statuses", () => {
    expect(mapStatus("trialing")).toBe("trialing");
    expect(mapStatus("unpaid")).toBe("past_due");
    expect(mapStatus("incomplete_expired")).toBe("canceled");
    expect(mapStatus("incomplete")).toBe("none");
  });
});

describe("productOf", () => {
  afterEach(() => { delete process.env.STRIPE_PRICE_ID_AGENTS; });
  const sub = (price: string, metadata: Record<string, string> = {}) =>
    ({ items: { data: [{ price: { id: price } }] }, metadata }) as never;

  it("detects Agents by price or metadata", () => {
    process.env.STRIPE_PRICE_ID_AGENTS = "price_agents";
    expect(productOf(sub("price_agents"))).toBe("agents");
    expect(productOf(sub("price_other", { product: "agents" }))).toBe("agents");
    expect(productOf(sub("price_cubits"))).toBe("cubits");
  });
});
