// OSV.dev detector (DETECTION_RULES §1). Never throws — returns a warning instead.

const OSV = 'https://api.osv.dev/v1';
const CHUNK = 500;
const MAX_DETAILS = 40;

async function postJson(url, body, signal) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`OSV ${res.status} ${res.statusText}`);
  return res.json();
}

async function getJson(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OSV ${res.status}`);
  return res.json();
}

const GHSA_SEVERITY = { CRITICAL: 'critical', HIGH: 'high', MODERATE: 'medium', MEDIUM: 'medium', LOW: 'low' };

function severityOf(vuln) {
  const ghsa = vuln.database_specific?.severity;
  if (ghsa && GHSA_SEVERITY[String(ghsa).toUpperCase()]) return GHSA_SEVERITY[String(ghsa).toUpperCase()];
  // CVSS: OSV usually stores the vector string; accept a bare numeric score too.
  for (const s of vuln.severity || []) {
    const n = Number(s.score);
    if (!Number.isNaN(n)) return n >= 9 ? 'critical' : n >= 7 ? 'high' : n >= 4 ? 'medium' : 'low';
  }
  return 'medium';
}

function fixedVersion(vuln, dep) {
  for (const aff of vuln.affected || []) {
    if (aff.package?.name && aff.package.name.toLowerCase() !== dep.name.toLowerCase()) continue;
    for (const range of aff.ranges || []) {
      const ev = (range.events || []).find((e) => e.fixed);
      if (ev) return ev.fixed;
    }
  }
  return null;
}

function toFinding(vuln, dep) {
  const malicious = vuln.id.startsWith('MAL-');
  const fixed = fixedVersion(vuln, dep);
  return {
    type: malicious ? 'malicious' : 'vulnerability',
    severity: malicious ? 'critical' : severityOf(vuln),
    title: vuln.summary || `${vuln.id} in ${dep.name}`,
    description: (vuln.details || vuln.summary || vuln.id).slice(0, 1200),
    package: dep.name,
    version: dep.version,
    ecosystem: dep.ecosystem,
    file: dep.file,
    evidence: [vuln.id, ...(vuln.aliases || [])].join(', '),
    source: 'osv',
    references: [`https://osv.dev/vulnerability/${vuln.id}`, ...(vuln.references || []).map((r) => r.url).slice(0, 4)],
    fix: malicious ? `Remove ${dep.name} immediately and rotate secrets` : fixed ? `Upgrade to ${fixed}` : undefined,
    ruleId: vuln.id,
  };
}

/**
 * @param deps Dependency[]
 * @returns {Promise<{findings: object[], warning: string|null}>}
 */
export async function detectOsv(deps = [], { timeoutMs = 15000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // Unique deps with a concrete version only.
    const uniq = new Map();
    for (const d of deps) {
      if (!d?.name || !d.version || !['npm', 'PyPI'].includes(d.ecosystem)) continue;
      const key = `${d.ecosystem}:${d.name}@${d.version}`;
      if (!uniq.has(key)) uniq.set(key, d);
    }
    const list = [...uniq.values()];
    if (!list.length) return { findings: [], warning: null };

    // 1. querybatch → vuln ids per dep (ids only).
    const hits = []; // { dep, ids }
    for (let i = 0; i < list.length; i += CHUNK) {
      const chunk = list.slice(i, i + CHUNK);
      const body = {
        queries: chunk.map((d) => ({ package: { name: d.name, ecosystem: d.ecosystem }, version: d.version })),
      };
      const data = await postJson(`${OSV}/querybatch`, body, ctrl.signal);
      (data.results || []).forEach((r, idx) => {
        const ids = (r.vulns || []).map((v) => v.id);
        if (ids.length) hits.push({ dep: chunk[idx], ids });
      });
    }

    // 2. Fetch details for unique ids (capped), in parallel.
    const allIds = [...new Set(hits.flatMap((h) => h.ids))];
    const ids = allIds.slice(0, MAX_DETAILS);
    const details = new Map();
    await Promise.all(
      ids.map(async (id) => {
        try {
          details.set(id, await getJson(`${OSV}/vulns/${encodeURIComponent(id)}`, ctrl.signal));
        } catch {
          details.set(id, { id }); // keep a minimal record
        }
      }),
    );

    const findings = [];
    for (const { dep, ids: depIds } of hits) {
      for (const id of depIds) {
        findings.push(toFinding(details.get(id) || { id }, dep));
      }
    }
    const warning =
      allIds.length > MAX_DETAILS
        ? `OSV: ${allIds.length} advisories found; details fetched for the first ${MAX_DETAILS} only.`
        : null;
    return { findings, warning };
  } catch (err) {
    const why = err?.name === 'AbortError' ? `timed out after ${timeoutMs} ms` : err?.message || String(err);
    return { findings: [], warning: `OSV lookup unavailable (${why}); showing heuristic and threat-intel findings only.` };
  } finally {
    clearTimeout(timer);
  }
}
