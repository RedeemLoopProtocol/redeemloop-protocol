import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        ink: "#171a1f",
        field: "#f6f7f9",
        line: "#d9dde5",
        accent: "#176b58",
      },
      boxShadow: {
        panel: "0 18px 45px -32px rgba(23, 26, 31, 0.32)",
      },
    },
  },
  plugins: [],
};

export default config;
