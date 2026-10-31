// Route manifest files to the right parser and return a deduped Dependency[].
import { parsePackageJson, parsePackageLock, parseInstalledPackageJson } from './npm.js';
import { parseRequirements } from './pip.js';

const basename = (p) => p.split('/').pop();
const isRequirements = (b) => /^requirements.*\.txt$/i.test(b);

export function isManifest(path) {
  const b = basename(path.replace(/\\/g, '/'));
  return b === 'package.json' || b === 'package-lock.json' || isRequirements(b);
}

function parseFile({ path, content }) {
  const file = path.replace(/\\/g, '/');
  const b = basename(file);
  const inNodeModules = /(^|\/)node_modules\//.test(file);
  if (b === 'package.json') {
    return inNodeModules ? parseInstalledPackageJson(content, file) : parsePackageJson(content, file);
  }
  if (b === 'package-lock.json' && !inNodeModules) return parsePackageLock(content, file);
  if (isRequirements(b)) return parseRequirements(content, file);
  return [];
}

/**
 * @param {{path: string, content: string}[]} files
 * @returns {object[]} Dependency[] deduped by ecosystem+name+version (smallest depth / direct wins)
 */
export function parseDependencies(files) {
  const byKey = new Map();
  for (const f of files || []) {
    let deps;
    try { deps = parseFile(f); } catch { continue; } // bad JSON etc. -> skip file
    for (const d of deps) {
      const key = `${d.ecosystem}:${d.name}@${d.version}`;
      const prev = byKey.get(key);
      if (!prev || d.depth < prev.depth || (d.depth === prev.depth && d.direct && !prev.direct)) {
        byKey.set(key, d);
      }
    }
  }
  return [...byKey.values()];
}
