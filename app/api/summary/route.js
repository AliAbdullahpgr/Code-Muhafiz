import { addAiSummary } from '../../../src/scanner.js';
import { loadReport, saveReport } from '../../../src/store.js';

export const runtime = 'nodejs';
export const maxDuration = 120;

// POST { scanId } → { mode, model, summary } — Gemma 4 summary for a saved report
export async function POST(request) {
  const { scanId } = await request.json().catch(() => ({}));
  const report = await loadReport(scanId);
  if (!report) return Response.json({ error: 'Unknown scanId' }, { status: 404 });
  if (report.ai?.mode === 'gemma') return Response.json(report.ai);
  await addAiSummary(report);
  await saveReport(report);
  return Response.json(report.ai);
}
