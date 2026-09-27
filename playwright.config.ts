import { defineConfig, devices } from '@playwright/test';

// E2E проти ЗІБРАНОГО бандла (vite preview), як у продакшні — статика + шлюз.
// Шлюз тут — еталонний мок, підключений до preview-сервера. Стан моку спільний,
// тому тести йдуть в один потік і скидають стан перед кожним.
export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx vite build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
