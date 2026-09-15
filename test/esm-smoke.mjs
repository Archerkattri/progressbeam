import assert from 'node:assert/strict';
import ProgressBeam from 'progressbeam';

assert.equal(typeof ProgressBeam.start, 'function');
assert.equal(typeof ProgressBeam.cancel, 'function');
console.log('ESM package import: ok');
