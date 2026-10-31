import { loadReport } from '../../../../src/store.js';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const { scanId } = await params;
  const report = await loadReport(scanId);
  if (!report) return Response.json({ error: 'Report not found' }, { status: 404 });
  return Response.json(report);
}
