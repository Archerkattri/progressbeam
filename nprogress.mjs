import * as moduleNamespace from './nprogress.js';

const NProgress = globalThis.NProgress || moduleNamespace.default || moduleNamespace;

export { NProgress };
export default NProgress;
