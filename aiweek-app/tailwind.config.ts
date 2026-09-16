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
        canvas: "#FFF8F0",
        "canvas-soft": "#FFE2CC",
        ink: { DEFAULT: "#2D211B", soft: "#665044", muted: "#70594C" },
        pink: {
          DEFAULT: "#FF8A3D",
          soft: "#FFE2CC",
          ink: "#A63D12",
        },
        plum: "#2D211B",
        lavender: "#FFF0B3",
        success: "#23633E",
        primary: {
          DEFAULT: "#FF8A3D",
          bright: "#FF8A3D",
          ink: "#A63D12",
          soft: "#FFE2CC",
        },
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(135deg, #FF8A3D 0%, #FFE2CC 50%, #FFF0B3 100%)",
        "accent-gradient":
          "linear-gradient(135deg, #FF8A3D 0%, #FFE2CC 100%)",
      },
      fontFamily: {
        sans: [
          "DM Sans",
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
          "0 4px 12px rgba(109, 59, 25, 0.08), 0 2px 4px rgba(24, 24, 27, 0.04)",
      },
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [],
};
