const assert = require('node:assert/strict');
const NProgress = require('nprogress');

assert.equal(typeof NProgress.start, 'function');
assert.equal(NProgress.version, '0.3.0-rc.0');
assert.equal(NProgress.isRendered(), false);
console.log('CommonJS and SSR package import: ok');
