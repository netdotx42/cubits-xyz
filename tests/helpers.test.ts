import { describe, expect, it } from "vitest";
import { safeInvite, safeNext } from "@/lib/safe-next";
import { lookup, render } from "@/lib/automations/template";
import { accountStatus } from "@/lib/account";
import { nextNumberFrom } from "@/lib/invoices/number";
import { calcTotals } from "@/components/cubits/util";

describe("safeNext", () => {
  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "/ok\nSet-Cookie:x", "", null])("rejects %s", (v) =>
    expect(safeNext(v as string | null, "/app")).toBe("/app")
  );
  it("keeps same-site paths", () => expect(safeNext("/app/invoices?x=1", "/app")).toBe("/app/invoices?x=1"));
  it("validates invite tokens", () => {
    expect(safeInvite("abcdef0123456789")).toBe("abcdef0123456789");
    expect(safeInvite("../x")).toBeNull();
  });
});

describe("template", () => {
  const payload = { form_name: "Contact", data: { name: "<b>Ann</b>", email: "a@b.co" } };
  it("renders merge fields and escapes when asked", () => {
    expect(render("Hi {{ data.name }}", payload)).toBe("Hi <b>Ann</b>");
    expect(render("Hi {{data.name}}", payload, { escape: true })).toBe("Hi &lt;b&gt;Ann&lt;/b&gt;");
  });
  it("blocks prototype paths and missing keys", () => {
    expect(lookup(payload, "__proto__.toString")).toBe("");
    expect(lookup(payload, "data.constructor")).toBe("");
    expect(lookup(payload, "data.missing")).toBe("");
  });
});

describe("accountStatus", () => {
  const now = Date.parse("2026-11-01T00:00:00Z");
  it("counts trial days and turns urgent on the last day", () => {
    expect(accountStatus({ plan_status: "trialing", trial_end: "2026-11-06T00:00:00Z" }, now)).toMatchObject({ state: "trial", daysLeft: 5 });
    expect(accountStatus({ plan_status: "trialing", trial_end: "2026-11-01T12:00:00Z" }, now).tone).toBe("urgent");
  });
  it("offers a resubscribe for canceled plans", () => {
    expect(accountStatus({ plan_status: "canceled", trial_end: null }, now).cta?.label).toBe("Resubscribe");
  });
});

describe("invoice numbers", () => {
  it("continues from the highest number of the same kind", () => {
    expect(nextNumberFrom(["INV-0001", "INV-0007", "QUO-0099", "INV-12-2"], "invoice")).toBe("INV-0008");
    expect(nextNumberFrom([], "quote")).toBe("QUO-0001");
  });
  it("calculates totals with tax", () => {
    expect(calcTotals([{ description: "x", qty: 2, unit_price: 50 }], 10)).toEqual({ subtotal: 100, tax: 10, total: 110 });
  });
});
