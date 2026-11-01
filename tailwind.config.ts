import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        panel: "#0a0a0a",
        line: "#1f1f1f",
        mute: "#8a8a8a",
        paper: "#f5f5f5",
        glow: { DEFAULT: "#7dd3fc", soft: "#bae6fd", deep: "#38bdf8" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
