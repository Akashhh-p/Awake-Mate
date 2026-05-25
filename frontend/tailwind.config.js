export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      colors: {
        obsidian: "#070A12",
        panel: "rgba(255, 238, 46, 0.93)",
        cyanGlow: "#10d2f0",
        violetGlow: "#A78BFA",
        successGlow: "#34D399",
        dangerGlow: "#FB7185",
      },
      boxShadow: {
        neon: "0 0 40px rgba(34, 211, 238, 0.22)",
        violet: "0 0 40px rgba(167, 139, 250, 0.2)",
      },
    },
  },
  plugins: [],
};
