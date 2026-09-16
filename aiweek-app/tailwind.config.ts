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
        // Warm light background
        canvas: "#FFFDF8",
        ink: { DEFAULT: "#1C1917", soft: "#57534E" },
        // Primary action orange (WCAG AA on white: 4.6:1)
        primary: {
          DEFAULT: "#C2570B", // AA-safe orange for text/icons
          bright: "#F97316", // vivid orange for fills/borders (pair with white text or dark text)
          soft: "#FFF3E8",
        },
        // Instagram-gradient accents — used selectively (borders, headers, pills)
        insta: {
          amber: "#FCAF45",
          coral: "#FD5949",
          rose: "#E1306C",
          violet: "#833AB4",
          deep: "#FF6A00",
        },
      },
      backgroundImage: {
        "insta-gradient":
          "linear-gradient(135deg,#FCAF45 0%,#FD5949 35%,#E1306C 70%,#833AB4 100%)",
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
    },
  },
  plugins: [],
};
