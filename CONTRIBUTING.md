# Contributing to ProgressBeam

Thanks for helping maintain ProgressBeam. Keep the core package dependency-free at
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
npm run test:size
npm run test:adapters
```

Browser tests use Playwright Chromium, Firefox, and WebKit. If the browsers are
not installed locally, run `npx playwright install chromium firefox webkit`
once.

CI additionally runs `publint` and `@arethetypeswrong/cli --pack .` against
the packed tarball. Run them before release when registry access is available;
on machines where `npx` cannot reach the registry, the CI run is the gate.

## Changes

Every behavior change should include a focused regression test. For requests
based on an old upstream issue or pull request, link the original item and
explain whether the change is a reimplementation, documentation update, or
intentional decline.

Please do not add framework dependencies to the core package. Framework
integrations belong in `adapters/` (zero runtime dependencies; framework
peers only) or in separate packages.

## Release

Releases are cut from a green `master` with no uncommitted changes:

1. Update the version, `History.md`, and `progressbeam.js` (`version`).
2. Run every verification command above plus the CI publint/attw gates.
3. Inspect the tarball with `npm pack --dry-run` (or `npm run pack:check`).
4. Publish with provenance so consumers get an SLSA attestation:
   `npm publish --provenance --access public`.
5. Tag the exact source commit (`git tag vX.Y.Z`) and push the tag.
