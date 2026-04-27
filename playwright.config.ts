import { defineConfig, devices } from "@playwright/test";

// Vite's production build uses base "/produce-gallery/" so vite preview serves
// the app at http://localhost:4173/produce-gallery/, not the bare root.
// Using `localhost` (not 127.0.0.1) so IPv6-bound `vite preview` is reachable.
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}/produce-gallery/`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
