/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lint runs as its own CI step (npm run lint).
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    const common = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    const noFrame = [
      ...common,
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com https://billing.stripe.com; object-src 'none'" },
    ];
    return [
      // Only public form pages (/f/*) are meant to be embedded on customers' sites.
      { source: "/f/:path*", headers: [...common, { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'" }] },
      { source: "/((?!f/).*)", headers: noFrame },
    ];
  },
};
export default nextConfig;
