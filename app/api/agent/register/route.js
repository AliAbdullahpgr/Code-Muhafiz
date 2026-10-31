import { registerAgent } from '../../../../src/solana/agent.js';

export const runtime = 'nodejs';

export async function POST() {
  try {
    return Response.json(await registerAgent());
  } catch (e) {
    return Response.json({ error: e.message || 'Could not register agent.' }, { status: 500 });
  }
}
