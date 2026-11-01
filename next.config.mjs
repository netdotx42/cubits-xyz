/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ESLint is not a build dependency; run it separately if you add it.
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    const common = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ];
    return [
      // The signed-in app and auth pages must never be framed.
      { source: "/app/:path*", headers: [...common, { key: "X-Frame-Options", value: "DENY" }] },
      { source: "/login", headers: [...common, { key: "X-Frame-Options", value: "DENY" }] },
      { source: "/signup", headers: [...common, { key: "X-Frame-Options", value: "DENY" }] },
      // Marketing and public form pages (/f/*) stay embeddable.
      { source: "/((?!app|login|signup).*)", headers: common },
    ];
  },
};
export default nextConfig;
