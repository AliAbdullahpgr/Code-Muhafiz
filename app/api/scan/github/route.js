import { scan } from '../../../../src/scanner.js';
import { saveReport } from '../../../../src/store.js';
import { fetchGithubRepo } from '../../../../src/ingest/github.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

// POST { repo, branch? } → Report (ai.mode 'pending'; call POST /api/summary next)
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body must be JSON' }, { status: 400 });
  }
  if (!body?.repo || typeof body.repo !== 'string') {
    return Response.json({ error: 'repo is required (owner/repo or GitHub URL)' }, { status: 400 });
  }
  try {
    const { target, files, warnings } = await fetchGithubRepo(body.repo, body.branch || null);
    const report = await scan({ source: 'github', target, files }, { ai: false });
    if (warnings.length) report.warnings = [...(report.warnings || []), ...warnings];
    await saveReport(report);
    return Response.json(report);
  } catch (err) {
    console.error('github scan failed:', err);
    return Response.json({ error: err.message || 'Scan failed' }, { status: err.status || 502 });
  }
}
