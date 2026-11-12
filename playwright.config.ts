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
  // Belt and braces for CI: a wedged browser or preview server can leave a
  // worker waiting forever, and the job then dies with no report at all (that
  // is how the weekly health check lost its runner). A full run takes ~1
  // minute, so 10 minutes only trips on a genuine hang and still writes the
  // HTML report before exiting non-zero.
  globalTimeout: process.env.CI ? 10 * 60_000 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    // The app honours prefers-reduced-motion (index.css), and the detail-view
    // emoji floats forever otherwise. Reducing motion keeps actionability
    // checks stable on CI runners (WebKit was timing out on clicks) and speeds
    // the suite up without weakening any assertion.
    reducedMotion: "reduce",
    // Aria snapshots ride along with the trace (Playwright 1.63+) so a failing
    // interaction can be read as an accessibility tree, not just a DOM dump.
    trace: {
      mode: "on-first-retry",
      snapshots: { dom: true, aria: true },
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
