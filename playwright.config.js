const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test',
  testMatch: '**/*.spec.js',
  webServer: {
    command: 'node test/fixture-server.cjs',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 10000
  },
  timeout: 10000,
  workers: 1,
  expect: {
    timeout: 3000
  },
  use: {
    headless: true
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } }
  ],
  reporter: [['line'], ['html', { open: 'never' }]]
});
