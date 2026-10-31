import { aiStatus } from '../../../src/ai/gemma.js';

export const runtime = 'nodejs';

export async function GET() {
  const ai = aiStatus();
  return Response.json({ ok: true, ai: ai.model, aiEnabled: ai.enabled, anthropic: ai.anthropic, anthropicModel: ai.anthropicModel, snowflake: false });
}
