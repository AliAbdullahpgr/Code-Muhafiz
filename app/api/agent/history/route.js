import { getHistory } from '../../../../src/solana/agent.js';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return Response.json(await getHistory());
  } catch (e) {
    return Response.json({ error: e.message || 'Could not load history.' }, { status: 500 });
  }
}
