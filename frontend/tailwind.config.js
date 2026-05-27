export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      colors: {
        obsidian: "#18c9f5",
        panel: "rgba(255, 234, 167, 0.86)",
        patriotBlue: "#28eee7",
        federalBlue: "#5e19f2",
        libertyRed: "#dc2626",
        starWhite: "#87deed",
        steel: "#475569",
        cyanGlow: "#25ebeb",
        violetGlow: "#dc2626",
        successGlow: "#10e45d",
        dangerGlow: "#dc2626",
      },
      boxShadow: {
        neon: "0 18px 55px rgba(49, 171, 187, 0.14)",
        violet: "0 18px 55px rgba(220, 38, 38, 0.12)",
      },
    },
  },
  plugins: [],
};
