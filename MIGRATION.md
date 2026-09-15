# Migrating from NProgress 0.2.0

The 0.3 maintenance candidate keeps the existing core methods and default
behavior while adding safer packaging and opt-in capabilities.

## What stays compatible

`start()`, `done()`, `set()`, `inc()`, `remove()`, `configure()`, `promise()`,
and `status` remain available. The legacy `[role="bar"]` and
`[role="spinner"]` selectors remain accepted for custom templates.

## Recommended package usage

```js
// CommonJS
const NProgress = require('nprogress');

// ESM
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

// Browser ESM resolves to the package's native .mjs entry.
```

The package can be imported during SSR. Only call DOM methods after a browser
document is available.

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
