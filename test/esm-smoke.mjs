import assert from 'node:assert/strict';
import NProgress from 'nprogress';

assert.equal(typeof NProgress.start, 'function');
assert.equal(typeof NProgress.cancel, 'function');
console.log('ESM package import: ok');
