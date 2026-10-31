// Central env config. Next.js loads .env automatically; the CLI loads it via process.loadEnvFile.
import path from 'node:path';

try { process.loadEnvFile?.(); } catch { /* no .env file — defaults apply */ }

const env = process.env;

// Vercel's deployment filesystem is read-only; only /tmp is writable (and per-instance).
const dataDir = env.DATA_DIR || (env.VERCEL ? '/tmp/code-muhafiz' : path.join(process.cwd(), 'data'));

export const config = {
  gemini: {
    apiKey: env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'your-key-here' ? env.GEMINI_API_KEY : '',
    model: env.GEMMA_MODEL || 'gemma-4-31b-it',
    fallbackModel: env.GEMMA_FALLBACK_MODEL || 'gemma-4-26b-a4b-it',
    timeoutMs: Number(env.GEMMA_TIMEOUT_MS || 45000),
  },
  anthropic: {
    apiKey: env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY !== 'your-key-here' ? env.ANTHROPIC_API_KEY : '',
    model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
    timeoutMs: Number(env.ANTHROPIC_TIMEOUT_MS || 45000),
  },
  githubToken: env.GITHUB_TOKEN || '',
  dataDir,
  // Upstash Redis via Vercel Marketplace (either naming scheme). When set, reports + ledger live there.
  kv: {
    url: env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || '',
    token: env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN || '',
  },
};
