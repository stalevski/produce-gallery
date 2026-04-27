import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// When deployed to GitHub Pages at https://<user>.github.io/produce-app/, the
// build needs a base path that matches the repo name. Local dev keeps the
// root base so URLs stay `/?...` rather than `/produce-app/?...`.
//
// Keying off `mode` rather than `command` so `vite preview` (which uses
// `command: 'serve'` like dev, but `mode: 'production'`) serves at the same
// `/produce-app/` base the built HTML expects.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "production" ? "/produce-app/" : "/",
  server: {
    port: 5173,
  },
}));
