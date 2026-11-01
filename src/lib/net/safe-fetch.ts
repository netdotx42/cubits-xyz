import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { isIP } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

/** A failure worth retrying once: network error, timeout, 429 or 5xx. */
export class TransientError extends Error {}

function ipv4Parts(ip: string): number[] | null {
  const p = ip.split(".").map(Number);
  return p.length === 4 && p.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? p : null;
}

function isPrivateIPv4(ip: string): boolean {
  const p = ipv4Parts(ip);
  if (!p) return true;
  const [a, b, c] = p;
  return (
    a === 0 ||                                  // "this" network
    a === 10 ||                                 // private
    a === 127 ||                                // loopback
    (a === 100 && b >= 64 && b <= 127) ||       // carrier-grade NAT
    (a === 169 && b === 254) ||                 // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||        // private
    (a === 192 && b === 0 && c === 0) ||        // IETF protocol assignments
    (a === 192 && b === 168) ||                 // private
    (a === 198 && (b === 18 || b === 19)) ||    // benchmarking
    a >= 224                                    // multicast and reserved
  );
}

function expandIPv6(ip: string): number[] | null {
  let s = ip.toLowerCase();
  const zone = s.indexOf("%");
  if (zone >= 0) s = s.slice(0, zone);
  // Trailing dotted IPv4 (::ffff:1.2.3.4) becomes two hextets.
  const v4 = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const p = ipv4Parts(v4[1]);
    if (!p) return null;
    s = s.slice(0, -v4[1].length) + ((p[0] << 8) | p[1]).toString(16) + ":" + ((p[2] << 8) | p[3]).toString(16);
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  const parts = [...head, ...Array(Math.max(0, fill)).fill("0"), ...tail].map((h) => parseInt(h, 16));
  return parts.length === 8 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 0xffff) ? parts : null;
}

function isPrivateIPv6(ip: string): boolean {
  const h = expandIPv6(ip);
  if (!h) return true;
  const allZeroUntil = (n: number) => h.slice(0, n).every((x) => x === 0);
  if (allZeroUntil(8)) return true;                                   // ::
  if (allZeroUntil(7) && h[7] === 1) return true;                     // ::1
  if (allZeroUntil(5) && h[5] === 0xffff) {                           // ::ffff:a.b.c.d (IPv4-mapped)
    return isPrivateIPv4(`${h[6] >> 8}.${h[6] & 255}.${h[7] >> 8}.${h[7] & 255}`);
  }
  if (allZeroUntil(6)) return true;                                   // deprecated IPv4-compatible
  if (h[0] === 0x64 && h[1] === 0xff9b) {                             // NAT64 64:ff9b::/96
    return isPrivateIPv4(`${h[6] >> 8}.${h[6] & 255}.${h[7] >> 8}.${h[7] & 255}`);
  }
  if ((h[0] & 0xfe00) === 0xfc00) return true;                        // fc00::/7 unique local
  if ((h[0] & 0xffc0) === 0xfe80) return true;                        // fe80::/10 link-local
  if ((h[0] & 0xff00) === 0xff00) return true;                        // multicast
  if (h[0] === 0x2001 && h[1] === 0x0db8) return true;                // documentation
  return false;
}

/** True for loopback, private, link-local, CGNAT, multicast and other non-public addresses. */
export function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPrivateIPv4(ip);
  if (kind === 6) return isPrivateIPv6(ip);
  return true;
}

const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home.arpa"];

/**
 * Throws unless the URL is https, has no credentials, and does not name a private host or IP.
 * Hostnames are checked again at connect time (see safePost), which also stops DNS rebinding.
 */
export function assertSafeUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (u.protocol !== "https:") throw new Error("Only https URLs are allowed");
  if (u.username || u.password) throw new Error("Credentials in URL are not allowed");
  let host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  if (!host || host === "localhost" || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) throw new Error("Host not allowed");
  if (isIP(host) && isPrivateAddress(host)) throw new Error("Private IP not allowed");
  return u;
}

/** Returns the URL when safe, null otherwise. */
export function safeUrl(raw: string): URL | null {
  try {
    return assertSafeUrl(raw);
  } catch {
    return null;
  }
}

type LookupCb = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/** DNS lookup that refuses to hand back any private address. Used for every outbound connection. */
export function safeLookup(hostname: string, options: { all?: boolean } | undefined, cb: LookupCb) {
  dnsLookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return cb(err, "");
    const list = addresses as LookupAddress[];
    if (!list.length) return cb(Object.assign(new Error(`No address for ${hostname}`), { code: "ENOTFOUND" }), "");
    const bad = list.find((a) => isPrivateAddress(a.address));
    if (bad) return cb(Object.assign(new Error("Host resolves to a private address"), { code: "EPRIVATE" }), "");
    if (options?.all) return cb(null, list);
    return cb(null, list[0].address, list[0].family);
  });
}

let dispatcher: Agent | null = null;
function agent() {
  dispatcher ??= new Agent({
    connect: { lookup: safeLookup as never },
    headersTimeout: 10_000,
    bodyTimeout: 10_000,
  });
  return dispatcher;
}

/**
 * POST JSON to a user-supplied URL with SSRF protection checked at connect time.
 * Redirects are not followed. Throws TransientError for retryable failures, Error otherwise.
 */
export async function safePost(
  url: string,
  body: unknown,
  opts: { headers?: Record<string, string>; timeoutMs?: number; rawBody?: string } = {}
): Promise<void> {
  const u = assertSafeUrl(url);
  let res: Awaited<ReturnType<typeof undiciFetch>>;
  try {
    res = await undiciFetch(u.toString(), {
      method: "POST",
      headers: { "content-type": "application/json", ...opts.headers },
      body: opts.rawBody ?? JSON.stringify(body),
      redirect: "manual",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
      dispatcher: agent(),
    });
  } catch (e) {
    const cause = (e as { cause?: { code?: string; message?: string } }).cause;
    if (cause?.code === "EPRIVATE") throw new Error("Host resolves to a private address");
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new TransientError(`Request timed out after ${(opts.timeoutMs ?? 10_000) / 1000}s`);
    }
    throw new TransientError(`Network error: ${cause?.message ?? (e instanceof Error ? e.message : String(e))}`);
  }
  // Drain the body so the connection can be reused.
  await res.arrayBuffer().catch(() => undefined);
  if (res.status === 429 || res.status >= 500) throw new TransientError(`HTTP ${res.status}`);
  if (res.status >= 300) throw new Error(`HTTP ${res.status}`);
}
