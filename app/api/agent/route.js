import { getAgent } from '../../../src/solana/agent.js';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return Response.json(await getAgent());
  } catch (e) {
    return Response.json({ error: e.message || 'Could not load agent.' }, { status: 500 });
  }
}
