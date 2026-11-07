import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-{platform}{ext}',
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000/design-system',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://offline.invalid',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'unused',
      NEXT_PUBLIC_MVP_USER_ID: '123e4567-e89b-12d3-a456-426614174000',
      SUPABASE_SERVICE_KEY: 'unused',
    },
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
})
