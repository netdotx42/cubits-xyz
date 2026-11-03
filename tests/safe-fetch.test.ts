import { describe, expect, it } from "vitest";
import { assertSafeUrl, isPrivateAddress, safeLookup } from "@/lib/net/safe-fetch";

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254",
    "100.64.0.1", "0.0.0.0", "224.0.0.1", "198.18.0.1",
    "::1", "::", "fc00::1", "fd12::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "64:ff9b::a9fe:a9fe", "ff02::1",
  ])("blocks %s", (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each(["1.1.1.1", "8.8.8.8", "172.32.0.1", "100.128.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"])(
    "allows %s",
    (ip) => expect(isPrivateAddress(ip)).toBe(false)
  );

  it("treats non-IPs as private", () => expect(isPrivateAddress("example.com")).toBe(true));
});

describe("assertSafeUrl", () => {
  it("accepts public https URLs", () => {
    expect(assertSafeUrl("https://hooks.slack.com/services/x").hostname).toBe("hooks.slack.com");
  });
  it.each([
    "http://example.com",
    "https://user:pw@example.com",
    "https://localhost/x",
    "https://foo.internal",
    "https://printer.local",
    "https://127.0.0.1/",
    "https://[::1]/",
    "https://2130706433/", // decimal form of 127.0.0.1, normalised by URL
    "https://169.254.169.254/latest/meta-data",
    "not a url",
  ])("rejects %s", (u) => expect(() => assertSafeUrl(u)).toThrow());
});

describe("safeLookup", () => {
  it("refuses hostnames that resolve to private addresses", async () => {
    const err = await new Promise<NodeJS.ErrnoException | null>((resolve) => safeLookup("localhost", {}, (e) => resolve(e)));
    expect(err?.code).toBe("EPRIVATE");
  });
});
