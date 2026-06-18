import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["SFMono-Regular", "ui-monospace", "Menlo", "monospace"],
      },
      colors: {
        paper: "#f4f2eb",
        chalk: "#fffdf7",
        ink: "#171a1f",
        muted: "#62666f",
        line: "#d8d3c7",
        field: "#ece8dd",
        pine: "#176b58",
        moss: "#829f5f",
        rust: "#b85f3a",
        brass: "#c29a32",
        night: "#22283a",
      },
      boxShadow: {
        panel: "0 22px 55px -38px rgba(23, 26, 31, 0.42)",
      },
    },
  },
  plugins: [],
};

export default config;
