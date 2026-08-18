import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Barlow Condensed'", "'Arial Narrow'", "sans-serif"],
        text: ["Archivo", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
