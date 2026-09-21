import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // PDF §7.2 design tokens — locked
        brand: {
          DEFAULT: "#0E7C86",
          light: "#0AA2B0",
        },
        slate: {
          nav: "#0F2942",
        },
        action: {
          DEFAULT: "#2563EB",
        },
        surface: {
          DEFAULT: "#F4F6F9",
          card: "#FFFFFF",
        },
        status: {
          healthy: "#16A34A",
          monitor: "#D97706",
          critical: "#DC2626",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #0E7C86 0%, #0AA2B0 100%)",
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15, 41, 66, 0.06), 0 1px 2px rgba(15, 41, 66, 0.04)",
        "card-hover":
          "0 4px 12px rgba(15, 41, 66, 0.08), 0 2px 4px rgba(15, 41, 66, 0.06)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "'Helvetica Neue'",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
