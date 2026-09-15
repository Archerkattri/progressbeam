# Migrating from NProgress to ProgressBeam

ProgressBeam is an independent continuation of the NProgress browser utility.
It keeps the familiar progress lifecycle while using a new package identity,
browser global, DOM namespace, and stylesheet entry point.

## What stays compatible

`start()`, `done()`, `set()`, `inc()`, `remove()`, `configure()`, `promise()`,
and `status` remain available. The legacy `[role="bar"]` and
`[role="spinner"]` selectors remain accepted for custom templates.

## Recommended package usage

```js
// CommonJS
const ProgressBeam = require('progressbeam');

// ESM
import ProgressBeam from 'progressbeam';
import 'progressbeam/progressbeam.css';

// Browser ESM resolves to the package's native .mjs entry.
```

The package can be imported during SSR. Only call DOM methods after a browser
document is available.

## Namespace changes

Update direct browser integrations and custom CSS selectors:

- `NProgress` becomes `ProgressBeam`.
- `#nprogress` becomes `#progressbeam`.
- `nprogress-*` classes and CSS variables become `progressbeam-*`.
- `nprogress.js`, `nprogress.mjs`, and `nprogress.css` become
  `progressbeam.js`, `progressbeam.mjs`, and `progressbeam.css`.

## Markup and accessibility

The default bar now uses `role="progressbar"` with valid ARIA value attributes,
and the spinner is hidden from assistive technology. Custom templates should
include an element matching `barSelector`; do not inject untrusted input into
`template`.

## New capabilities

- `delay`, `showBar`, `showSpinner`, `barColor`, `spinnerColor`, `failureColor`,
  `height`, `zIndex`, `maximum`, `indeterminate`, and `rtl` configuration.
- `pause()`, `resume()`, `cancel()`, and `fail()` methods.
- `on()` / `off()` lifecycle hooks for framework-neutral integrations.

## Behavior to review

`cancel()` resets the operation to idle. `remove()` retains its legacy behavior
for callers that depend on the existing method. The maintained browser target
is current Chromium, Firefox, and WebKit; Internet Explorer-specific behavior
is no longer a release target.
