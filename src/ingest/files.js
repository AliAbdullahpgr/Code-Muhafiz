// Decide which files of a codebase are worth scanning. Applied both in the browser and on the server.
export const MAX_FILE_BYTES = 200 * 1024;
export const MAX_FILES = 3000;

const MANIFEST_RE = /(^|\/)(package\.json|package-lock\.json|requirements[^/]*\.txt)$/;
const SOURCE_RE = /\.(js|mjs|cjs|ts|py|sh)$/;
const SKIP_DIR_RE = /(^|\/)(\.git|\.next|dist|build|coverage|__pycache__|\.venv|venv)\//;

export function isManifestPath(path) {
  return MANIFEST_RE.test(path);
}

export function isScannablePath(path) {
  if (SKIP_DIR_RE.test(path)) return false;
  return MANIFEST_RE.test(path) || SOURCE_RE.test(path);
}

// files: [{ path, content }] → normalized, filtered, capped list
export function filterFiles(files) {
  const out = [];
  for (const f of files || []) {
    if (!f || typeof f.path !== 'string' || typeof f.content !== 'string') continue;
    const path = f.path.replace(/\\/g, '/').replace(/^\.?\//, '');
    if (!isScannablePath(path) || f.content.length > MAX_FILE_BYTES) continue;
    out.push({ path, content: f.content });
    if (out.length >= MAX_FILES) break;
  }
  return out;
}
