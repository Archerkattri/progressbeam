// Native ESM entry. The single source of truth is progressbeam.js (UMD):
// under Node the namespace default is the CJS export (same module instance,
// so CJS and ESM consumers share state); in browsers the UMD build assigns
// the global, which is used here as the fallback.
import * as moduleNamespace from './progressbeam.js';

const ProgressBeam =
  moduleNamespace.default || moduleNamespace.ProgressBeam || globalThis.ProgressBeam;

if (!ProgressBeam) {
  throw new Error('progressbeam: unable to resolve the ProgressBeam export');
}

export { ProgressBeam };
export default ProgressBeam;
