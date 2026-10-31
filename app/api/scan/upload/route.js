import { scan } from '../../../../src/scanner.js';
import { saveReport } from '../../../../src/store.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

// POST { name, files: [{ path, content }] } → Report (ai.mode 'pending'; call POST /api/summary next)
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body must be JSON' }, { status: 400 });
  }
  if (!Array.isArray(body?.files) || body.files.length === 0) {
    return Response.json({ error: 'files[] is required' }, { status: 400 });
  }
  try {
    const report = await scan(
      { source: 'upload', target: `upload:${body.name || 'project'}`, files: body.files },
      { ai: false },
    );
    await saveReport(report);
    return Response.json(report);
  } catch (err) {
    console.error('scan failed:', err);
    return Response.json({ error: err.message || 'Scan failed' }, { status: 500 });
  }
}
