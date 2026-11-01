import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

const description =
  "Invoices, forms and automations in one workspace for small businesses and agencies. $29 a month flat, up to 5 seats.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Cubits: power your business from one workspace", template: "%s" },
  description,
  openGraph: {
    type: "website",
    siteName: "Cubits",
    title: "Cubits: power your business from one workspace",
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cubits: power your business from one workspace",
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${sans.variable} ${mono.variable} bg-black text-paper font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
