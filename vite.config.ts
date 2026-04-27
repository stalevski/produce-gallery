import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// When deployed to GitHub Pages at https://<user>.github.io/produce-gallery/,
// the build needs a base path that matches the repo name. Local dev keeps the
// root base so URLs stay `/?...` rather than `/produce-gallery/?...`.
//
// Keying off `mode` rather than `command` so `vite preview` (which uses
// `command: 'serve'` like dev, but `mode: 'production'`) serves at the same
// `/produce-gallery/` base the built HTML expects.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "production" ? "/produce-gallery/" : "/",
  server: {
    port: 5173,
  },
}));
