// Report persistence: one JSON file per scan in data/reports/. Good enough for the MVP (no DB).
import fs from 'node:fs/promises';
import path from 'node:path';

const REPORTS_DIR = path.join(process.cwd(), 'data', 'reports');
const SCAN_ID_RE = /^[a-f0-9]{12}$/;

export async function saveReport(report) {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(path.join(REPORTS_DIR, `${report.scanId}.json`), JSON.stringify(report, null, 2));
  return report;
}

// Newest first, without the heavy fields (dependencies, findings, AI text).
export async function listReports() {
  let names = [];
  try {
    names = (await fs.readdir(REPORTS_DIR)).filter((n) => n.endsWith('.json'));
  } catch {
    return [];
  }
  const reports = await Promise.all(names.map((n) => loadReport(n.slice(0, -5))));
  return reports
    .filter(Boolean)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ dependencies: _d, findings: _f, ai: _a, ...rest }) => rest);
}

export async function loadReport(scanId) {
  if (!SCAN_ID_RE.test(String(scanId))) return null;
  try {
    return JSON.parse(await fs.readFile(path.join(REPORTS_DIR, `${scanId}.json`), 'utf8'));
  } catch {
    return null;
  }
}
