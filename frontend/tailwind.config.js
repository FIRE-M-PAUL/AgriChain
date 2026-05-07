/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#22c55e",
        brandGold: "#f5c968",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(15, 23, 42, 0.3)",
      },
      backgroundImage: {
        hero: "radial-gradient(circle at top right, rgba(34,197,94,0.24), transparent 36%), radial-gradient(circle at bottom left, rgba(16,185,129,0.22), transparent 38%)",
      },
    },
  },
  plugins: [],
};
