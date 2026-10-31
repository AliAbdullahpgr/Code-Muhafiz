// Pipeline orchestrator: ingest → parse → detect → score → AI explain → report.
import crypto from 'node:crypto';
import { filterFiles, isManifestPath } from './ingest/files.js';
import { parseDependencies } from './parsers/index.js';
import { runDetectors } from './detectors/index.js';
import { scoreFindings } from './detectors/scoring.js';
import { summarizeReport } from './ai/gemma.js';

// Sorted-keys JSON so the same report core always hashes the same.
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().filter((k) => value[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export function hashReport(report) {
  const core = {
    scanId: report.scanId, createdAt: report.createdAt, target: report.target,
    agent: report.agent, summary: report.summary,
    findings: report.findings.map((f) => ({
      type: f.type, severity: f.severity, package: f.package, version: f.version,
      ruleId: f.ruleId, file: f.file, line: f.line,
    })),
  };
  return crypto.createHash('sha256').update(canonicalJson(core)).digest('hex');
}

// input: { source: 'github'|'upload'|'local', target, files: [{ path, content }] }
export async function scan(input, { offline = false, ai = true } = {}) {
  const files = filterFiles(input.files);
  const dependencies = parseDependencies(files);
  const { findings: raw, warnings } = await runDetectors(dependencies, files, { offline });
  const findings = raw.map((f, i) => ({ id: `f-${i + 1}`, ...f }));

  const ecosystems = {};
  for (const d of dependencies) ecosystems[d.ecosystem] = (ecosystems[d.ecosystem] || 0) + 1;
  const direct = dependencies.filter((d) => d.direct).length;

  const report = {
    scanId: crypto.randomBytes(6).toString('hex'),
    createdAt: new Date().toISOString(),
    agent: null,
    source: input.source,
    target: input.target,
    stats: {
      files: files.length,
      manifests: files.filter((f) => isManifestPath(f.path)).length,
      dependencies: dependencies.length,
      direct,
      transitive: dependencies.length - direct,
      ecosystems,
    },
    dependencies,
    findings,
    summary: scoreFindings(findings),
    ai: null,
    warnings,
    reportHash: null,
    proof: null,
  };

  // AI text is excluded from the hash, so the summary can be filled in later (see addAiSummary).
  report.ai = ai ? await summarizeReport(report) : { mode: 'pending', model: null, summary: '' };
  report.reportHash = hashReport(report);
  return report;
}

// Gemma takes 30–100 s under load, so the API returns findings first and summarizes in a second call.
export async function addAiSummary(report) {
  report.ai = await summarizeReport(report);
  return report;
}
