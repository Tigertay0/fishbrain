import { defineConfig, devices } from '@playwright/test'
import { GOLDEN } from './e2e/mocks'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    // A service worker would bypass page.route; tests exercise the app, not Workbox.
    serviceWorkers: 'block',
    geolocation: { latitude: GOLDEN.lat, longitude: GOLDEN.lon, accuracy: 12 },
    permissions: ['geolocation'],
    locale: 'en-US',
    timezoneId: 'America/Denver',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
