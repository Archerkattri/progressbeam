# Contributing to NProgress

Thanks for helping maintain NProgress. Keep the core package dependency-free at
runtime and preserve the public API unless a compatibility change is explicitly
reviewed.

## Development

Use Node.js 20.19 or newer, install dependencies with `npm ci`, and run:

```text
npm test
npm run test:browser
npm run test:runtime
npm run typecheck
npm run test:package
npm run test:packed
npm run pack:check
```

Browser tests use Playwright Chromium, Firefox, and WebKit. If the browsers are
not installed locally, run `npx playwright install chromium firefox webkit`
once.

## Changes

Every behavior change should include a focused regression test. For requests
based on an old upstream issue or pull request, link the original item and
explain whether the change is a reimplementation, documentation update, or
intentional decline.

Please do not add framework dependencies to the core package. Framework
integrations belong in separate packages or examples.
