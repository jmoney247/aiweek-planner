/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#FFFBFD",
        "canvas-soft": "#FFF1F7",
        ink: { DEFAULT: "#18181B", soft: "#52525B", muted: "#71717A" },
        pink: {
          DEFAULT: "#FF4FA3",
          soft: "#FFF1F7",
          ink: "#C2187A",
        },
        plum: "#3A183E",
        lavender: "#A78BFA",
        success: "#22C55E",
        primary: {
          DEFAULT: "#FF4FA3",
          bright: "#FF4FA3",
          ink: "#C2187A",
          soft: "#FFF1F7",
        },
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(135deg, #FF4FA3 0%, #A855F7 50%, #6366F1 100%)",
        "accent-gradient":
          "linear-gradient(135deg, #FF4FA3 0%, #A855F7 100%)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px rgba(24, 24, 27, 0.06), 0 1px 2px rgba(24, 24, 27, 0.04)",
        "card-hover":
          "0 4px 12px rgba(255, 79, 163, 0.08), 0 2px 4px rgba(24, 24, 27, 0.04)",
      },
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [],
};
