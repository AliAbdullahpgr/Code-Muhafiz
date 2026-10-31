import { aiStatus } from '../../../src/ai/gemma.js';

export const runtime = 'nodejs';

export async function GET() {
  const ai = aiStatus();
  return Response.json({ ok: true, ai: ai.model, aiEnabled: ai.enabled, snowflake: false, solana: { mode: 'simulated', agent: null } });
}
