import { explainFinding } from '../../../src/ai/gemma.js';
import { loadReport } from '../../../src/store.js';

export const runtime = 'nodejs';
export const maxDuration = 120;

// POST { scanId, findingId } → { explanation, mode, model } — Gemma 4 deep dive on one finding
export async function POST(request) {
  const { scanId, findingId } = await request.json().catch(() => ({}));
  const report = await loadReport(scanId);
  if (!report) return Response.json({ error: 'Unknown scanId' }, { status: 404 });
  const finding = report.findings.find((f) => f.id === findingId);
  if (!finding) return Response.json({ error: 'Unknown findingId' }, { status: 404 });
  return Response.json(await explainFinding(finding));
}
