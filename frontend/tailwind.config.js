/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eff6ff",
          100: "#dbeafe",
          500: "#1a6fa5",
          600: "#1a5a8a",
          700: "#164d78",
          900: "#0f3558",
        },
        alert: {
          red:    "#c0392b",
          orange: "#d4831a",
          green:  "#2d8a5e",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
