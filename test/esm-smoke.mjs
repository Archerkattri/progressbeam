import assert from 'node:assert/strict';
import ProgressBeam, { ProgressBeam as Named } from 'progressbeam';

assert.equal(typeof ProgressBeam.start, 'function');
assert.equal(typeof ProgressBeam.cancel, 'function');
assert.equal(Named, ProgressBeam);
console.log('ESM package import: ok');
