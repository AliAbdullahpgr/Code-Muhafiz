// Runs every detector and merges results.
import { detectOsv } from './osv.js';
import { detectThreatIntel } from './threatintel.js';
import { detectTyposquats } from './typosquat.js';
import { detectInstallScripts, detectSuspiciousCode } from './patterns.js';

export { scoreFindings } from './scoring.js';

const RANK = { critical: 0, high: 1, medium: 2, low: 3 };

export async function runDetectors(deps = [], files = [], { offline = false } = {}) {
  const warnings = [];
  const findings = [
    ...detectThreatIntel(deps),
    ...detectTyposquats(deps),
    ...detectInstallScripts(files),
    ...detectSuspiciousCode(files),
  ];

  if (offline) {
    warnings.push('Offline mode: OSV vulnerability lookup skipped.');
  } else {
    const osv = await detectOsv(deps);
    findings.push(...osv.findings);
    if (osv.warning) warnings.push(osv.warning);
  }

  findings.sort((a, b) => (RANK[a.severity] ?? 9) - (RANK[b.severity] ?? 9));
  return { findings, warnings };
}
