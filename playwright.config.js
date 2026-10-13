const { defineConfig } = require('@playwright/test');
const { execFileSync } = require('node:child_process');

const port = Number(process.env.PLAYWRIGHT_PORT || execFileSync(process.execPath, [
  '-e',
  'const net=require("node:net");const server=net.createServer();server.listen(0,"127.0.0.1",()=>{const port=server.address().port;server.close(()=>process.stdout.write(String(port)));});'
], { encoding: 'utf8' }).trim());
process.env.PLAYWRIGHT_PORT = String(port);

module.exports = defineConfig({
  testDir: './test',
  testMatch: '**/*.spec.js',
  webServer: {
    command: 'node test/fixture-server.cjs',
    url: `http://127.0.0.1:${port}`,
    env: { PLAYWRIGHT_PORT: String(port) },
    reuseExistingServer: false,
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
