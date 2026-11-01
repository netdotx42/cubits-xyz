import { ImageResponse } from "next/og";
import { CARD_SIZE, HOOK, PLATFORMS, SUB, type SharePlatform } from "@/lib/share";

export const dynamicParams = false;
export function generateStaticParams() {
  return PLATFORMS.map((platform) => ({ platform }));
}

const GLOW = "#7dd3fc";
const LABEL: Record<SharePlatform, string> = { x: "X", linkedin: "LinkedIn", instagram: "Instagram" };

export async function GET(_req: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  if (!PLATFORMS.includes(platform as SharePlatform)) return new Response("Not found", { status: 404 });
  const p = platform as SharePlatform;
  const size = CARD_SIZE[p];
  const portrait = p === "instagram";
  const lines = ["Invoices in one tab.", "Leads in another.", "Follow-ups in your head."];
  void HOOK;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: portrait ? "88px 80px" : "60px 72px",
          background: "#000",
          backgroundImage: portrait
            ? "radial-gradient(ellipse 90% 45% at 50% 0%, rgba(125,211,252,0.34), rgba(0,0,0,0) 70%)"
            : "radial-gradient(ellipse 70% 70% at 85% 0%, rgba(125,211,252,0.30), rgba(0,0,0,0) 70%)",
          color: "#f5f5f5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: portrait ? 44 : 34, fontWeight: 600 }}>
          <div style={{ width: portrait ? 28 : 22, height: portrait ? 28 : 22, background: GLOW, borderRadius: 5, display: "flex" }} />
          Cubits
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {lines.map((l, i) => (
            <div
              key={l}
              style={{
                display: "flex",
                fontSize: portrait ? 112 : 86,
                fontWeight: 700,
                lineHeight: 1.04,
                letterSpacing: -3,
                color: i === 2 ? GLOW : i === 1 ? "#d4d4d4" : "#f5f5f5",
              }}
            >
              {l}
            </div>
          ))}
          <div style={{ display: "flex", marginTop: portrait ? 44 : 32, fontSize: portrait ? 42 : 32, color: "#a3a3a3" }}>
            {SUB}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              padding: portrait ? "16px 34px" : "12px 26px",
              background: GLOW,
              color: "#000",
              borderRadius: 999,
              fontSize: portrait ? 34 : 26,
              fontWeight: 600,
            }}
          >
            Start your 7-day free trial
          </div>
          <div style={{ display: "flex", fontSize: portrait ? 28 : 22, color: "#737373" }}>{portrait ? "Link in bio" : LABEL[p]}</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
