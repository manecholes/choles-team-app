import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Identidad Choles Team: azul turqui, rojo, blanco
        turqui: {
          50: "#eef4f8",
          100: "#d3e3ee",
          200: "#a7c7dd",
          300: "#7aabcc",
          400: "#4d8fbb",
          500: "#2a6f9c",
          600: "#1c4f74",
          700: "#123852", // primario
          800: "#0d2a3d",
          900: "#081c29",
        },
        choles: {
          red: "#d62828",
          redDark: "#a11e1e",
          white: "#ffffff",
        },
        status: {
          green: "#16a34a",
          yellow: "#eab308",
          red: "#dc2626",
          gray: "#9ca3af",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
