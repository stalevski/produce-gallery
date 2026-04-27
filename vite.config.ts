import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// When deployed to GitHub Pages at https://<user>.github.io/produce-app/, the
// build needs a base path that matches the repo name. Local dev keeps the
// root base so URLs stay `/?...` rather than `/produce-app/?...`.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/produce-app/" : "/",
  server: {
    port: 5173,
  },
}));
