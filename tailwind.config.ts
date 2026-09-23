import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#4A3B33",
        inkSoft: "#6E5A4F",
        inkFaint: "#9A867A",
        accent: "#D98E63",
        accentDeep: "#C57B51",
        accentSoft: "#FBE6D8",
        card: "#FFFBF6",
        panel: "#FBF3EA",
        line: "#EFE2D4",
      },
      borderRadius: { xl2: "20px", xl3: "28px" },
      boxShadow: { soft: "0 10px 30px rgba(120, 90, 70, 0.08)" },
    },
  },
  plugins: [],
};
export default config;
