// npm manifest parsers: package.json, package-lock.json (v1/v2/v3), node_modules/**/package.json.
// Pure text parsing — scanned code is never executed.

/** Minimum version implied by a semver range: "^4.17.15" -> "4.17.15", "*" -> "". */
export function minVersion(range) {
  if (typeof range !== 'string') return '';
  const m = range.match(/(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?(-[0-9A-Za-z.-]+)?/);
  if (!m) return '';
  const part = (p) => (p === undefined || p === 'x' || p === '*' ? '0' : p);
  return `${m[1]}.${part(m[2])}.${part(m[3])}${m[4] || ''}`;
}

/** Number of `node_modules/` segments in a path, minus 1 (so top-level package = 0). */
export function nodeModulesDepth(path) {
  const count = (path.match(/(^|\/)node_modules\//g) || []).length;
  return Math.max(0, count - 1);
}

const DEP_FIELDS = [
  ['dependencies', false],
  ['devDependencies', true],
  ['optionalDependencies', false],
];

/** package.json (project root, not inside node_modules) -> direct deps. */
export function parsePackageJson(content, file) {
  const pkg = JSON.parse(content);
  const deps = [];
  for (const [field, dev] of DEP_FIELDS) {
    for (const [name, range] of Object.entries(pkg[field] || {})) {
      deps.push({
        name, version: minVersion(String(range)), range: String(range),
        ecosystem: 'npm', file, direct: true, depth: 0, dev,
      });
    }
  }
  return deps;
}

/** node_modules/<...>/package.json -> the installed package itself (transitive). */
export function parseInstalledPackageJson(content, file) {
  const pkg = JSON.parse(content);
  if (!pkg.name) return [];
  return [{
    name: pkg.name, version: pkg.version || '', range: pkg.version || '',
    ecosystem: 'npm', file, direct: false, depth: nodeModulesDepth(file), dev: false,
  }];
}

/** package-lock.json v1 (nested `dependencies`) or v2/v3 (`packages`). */
export function parsePackageLock(content, file) {
  const lock = JSON.parse(content);
  const deps = [];

  if (lock.packages && typeof lock.packages === 'object') {
    for (const [key, info] of Object.entries(lock.packages)) {
      if (!key || !key.includes('node_modules/') || !info) continue; // skip root "" and workspace links
      const name = info.name || key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length);
      const depth = nodeModulesDepth(key);
      deps.push({
        name, version: info.version || '', range: info.version || '',
        ecosystem: 'npm', file, direct: depth === 0, depth, dev: Boolean(info.dev),
      });
    }
    return deps;
  }

  const walk = (tree, depth) => {
    for (const [name, info] of Object.entries(tree || {})) {
      if (!info) continue;
      deps.push({
        name, version: info.version || '', range: info.version || '',
        ecosystem: 'npm', file, direct: depth === 0, depth, dev: Boolean(info.dev),
      });
      if (info.dependencies) walk(info.dependencies, depth + 1);
    }
  };
  walk(lock.dependencies, 0);
  return deps;
}
