import { loadReport } from '../../../../../src/store.js';
import { verifyProof } from '../../../../../src/solana/agent.js';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const { scanId } = await params;
  try {
    const report = await loadReport(scanId);
    if (!report) return Response.json({ error: 'Report not found.' }, { status: 404 });
    if (!report.proof) return Response.json({ error: 'No proof recorded for this report.' }, { status: 404 });
    return Response.json(await verifyProof(report));
  } catch (e) {
    return Response.json({ error: e.message || 'Could not verify proof.' }, { status: 500 });
  }
}
