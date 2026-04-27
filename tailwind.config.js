/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ["'Fraunces'", "ui-serif", "Georgia", "serif"],
        sans: ["'Inter'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        cream: "rgb(var(--c-cream) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
      },
      boxShadow: {
        soft: "0 1px 2px rgb(var(--c-shadow) / 0.04), 0 8px 24px rgb(var(--c-shadow) / 0.06)",
      },
    },
  },
  plugins: [],
};
