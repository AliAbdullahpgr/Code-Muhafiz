// Report persistence. Upstash Redis when configured (Vercel), otherwise one JSON file per scan
// in <dataDir>/reports/ (data/ locally, /tmp on Vercel without Redis).
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { kv, kvEnabled } from './kv.js';

const REPORTS_DIR = path.join(config.dataDir, 'reports');
const SCAN_ID_RE = /^[a-f0-9]{12}$/;
const MAX_LISTED = 50;

const summaryOf = ({ dependencies: _d, findings: _f, ai: _a, ...rest }) => rest;

export async function saveReport(report) {
  if (kvEnabled()) {
    const isNew = !(await kv('EXISTS', `report:${report.scanId}`));
    await kv('SET', `report:${report.scanId}`, JSON.stringify(report));
    if (isNew) {
      await kv('LPUSH', 'reports', report.scanId);
      await kv('LTRIM', 'reports', 0, 199);
    }
    return report;
  }
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(path.join(REPORTS_DIR, `${report.scanId}.json`), JSON.stringify(report, null, 2));
  return report;
}

// Newest first, without the heavy fields (dependencies, findings, AI text).
export async function listReports() {
  if (kvEnabled()) {
    const ids = await kv('LRANGE', 'reports', 0, MAX_LISTED - 1);
    if (!ids?.length) return [];
    const rows = await kv('MGET', ...ids.map((id) => `report:${id}`));
    return rows.filter(Boolean).map((s) => summaryOf(JSON.parse(s)));
  }
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
    .slice(0, MAX_LISTED)
    .map(summaryOf);
}

export async function loadReport(scanId) {
  if (!SCAN_ID_RE.test(String(scanId))) return null;
  try {
    if (kvEnabled()) {
      const raw = await kv('GET', `report:${scanId}`);
      return raw ? JSON.parse(raw) : null;
    }
    return JSON.parse(await fs.readFile(path.join(REPORTS_DIR, `${scanId}.json`), 'utf8'));
  } catch {
    return null;
  }
}
