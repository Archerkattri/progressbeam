const assert = require('node:assert/strict');
const ProgressBeam = require('progressbeam');

assert.equal(typeof ProgressBeam.start, 'function');
assert.equal(ProgressBeam.version, '1.0.2');
assert.equal(ProgressBeam.isRendered(), false);
console.log('CommonJS and SSR package import: ok');
