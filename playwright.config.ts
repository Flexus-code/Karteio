import { defineConfig, devices } from '@playwright/test'

/** End-to-End-Tests im iPhone-Format mit der Safari-Engine (WebKit). */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['iPhone 14'],
    // ?noanim schaltet Animationen ab (nur im Entwicklungsmodus) → stabile Tests
    baseURL: 'http://localhost:5199/?noanim',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'iPhone (WebKit)', use: { browserName: 'webkit' } }],
  webServer: {
    command: 'npx vite --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
