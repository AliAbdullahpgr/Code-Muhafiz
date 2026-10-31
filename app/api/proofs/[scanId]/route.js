import { loadReport, saveReport } from '../../../../src/store.js';
import { recordProof } from '../../../../src/solana/agent.js';

export const runtime = 'nodejs';

export async function POST(req, { params }) {
  const { scanId } = await params;
  try {
    const report = await loadReport(scanId);
    if (!report) return Response.json({ error: 'Report not found.' }, { status: 404 });
    const proof = await recordProof(report);
    report.proof = proof;
    await saveReport(report);
    return Response.json(proof);
  } catch (e) {
    return Response.json({ error: e.message || 'Could not record proof.' }, { status: 500 });
  }
}
