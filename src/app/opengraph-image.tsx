import { ImageResponse } from "next/og";

export const alt = "Cubits: invoices, forms and automations in one workspace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GLOW = "#7dd3fc";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#000",
          backgroundImage:
            "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(125,211,252,0.32), rgba(0,0,0,0) 70%)",
          color: "#f5f5f5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 34, fontWeight: 600 }}>
          <div style={{ width: 22, height: 22, background: GLOW, borderRadius: 4, display: "flex" }} />
          Cubits
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: -3,
            }}
          >
            <span style={{ marginRight: 22 }}>Power your business</span>
            <span style={{ color: GLOW }}>from one workspace.</span>
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 34, color: "#a3a3a3" }}>
            Invoices. Forms. Automations. $29 a month, flat.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {["Invoices", "Forms", "Automations"].map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  padding: "10px 22px",
                  border: "1px solid rgba(125,211,252,0.45)",
                  borderRadius: 999,
                  fontSize: 24,
                  color: GLOW,
                }}
              >
                {t}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#737373" }}>7-day free trial</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
