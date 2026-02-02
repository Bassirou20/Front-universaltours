
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#0ea5a6" },
        panel: "#0f172a",
        surface: "#0b1220"
      },
      boxShadow: { soft: "0 6px 24px -8px rgba(0,0,0,.25)" }
    }
  },
  plugins: [],
}
