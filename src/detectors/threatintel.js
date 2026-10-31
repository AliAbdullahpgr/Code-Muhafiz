// Threat-intel detector (DETECTION_RULES §2): match deps against a compromised-packages table.
import fs from 'node:fs';
import path from 'node:path';

let cache = null;

/** Load the local snapshot (data/compromised_packages.json). Returns [] if missing/invalid. */
export function loadSnapshot() {
  if (cache) return cache;
  try {
    const file = path.join(process.cwd(), 'data', 'compromised_packages.json');
    cache = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    cache = [];
  }
  return cache;
}

/**
 * @param deps Dependency[]
 * @param rows compromised-package rows (snapshot or Snowflake, lower-cased keys)
 * @param source 'snapshot' | 'snowflake'
 */
export function detectThreatIntel(deps = [], rows = loadSnapshot(), source = 'snapshot') {
  const index = new Map();
  for (const row of rows) {
    const key = `${String(row.ecosystem).toLowerCase()}:${String(row.package_name).toLowerCase()}`;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(row);
  }

  const findings = [];
  const seen = new Set();
  for (const dep of deps) {
    const key = `${String(dep.ecosystem).toLowerCase()}:${String(dep.name).toLowerCase()}`;
    for (const row of index.get(key) || []) {
      const v = String(row.version);
      if (v !== '*' && v !== String(dep.version)) continue;
      const dedupe = `${key}@${dep.version}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      findings.push({
        type: 'malicious',
        severity: row.severity || 'critical',
        title: `Known compromised package: ${dep.name}${dep.version ? '@' + dep.version : ''}`,
        description: `${row.category ? `[${row.category}] ` : ''}${row.reason || 'Listed in threat-intel feed.'}`,
        package: dep.name,
        version: dep.version || undefined,
        ecosystem: dep.ecosystem,
        file: dep.file,
        evidence: `${row.package_name}@${v} (${row.source || 'intel'})`,
        source,
        references: row.reference_url ? [row.reference_url] : [],
        fix: v === '*' ? `Remove ${dep.name} entirely` : `Remove or pin ${dep.name} to a version other than ${v}`,
        ruleId: `intel-${row.category || 'compromised'}`,
      });
    }
  }
  return findings;
}
