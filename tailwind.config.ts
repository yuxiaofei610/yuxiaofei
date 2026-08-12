import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b0d12",
          soft: "#11141b",
          card: "#161a23",
          hover: "#1c2230",
        },
        line: "#262d3a",
        brand: {
          DEFAULT: "#ff4d6d",
          soft: "#ff7a93",
        },
        accent: "#5b8cff",
        muted: "#8b94a7",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "PingFang SC", "Microsoft YaHei", "sans-serif"],
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        fadeup: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.4s infinite",
        fadeup: "fadeup 0.35s ease both",
      },
    },
  },
  plugins: [],
};

export default config;
