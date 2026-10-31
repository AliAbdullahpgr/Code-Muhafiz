// Central env config. Next.js loads .env automatically; the CLI loads it via process.loadEnvFile.
try { process.loadEnvFile?.(); } catch { /* no .env file — defaults apply */ }

const env = process.env;

export const config = {
  gemini: {
    apiKey: env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'your-key-here' ? env.GEMINI_API_KEY : '',
    model: env.GEMMA_MODEL || 'gemma-4-31b-it',
    fallbackModel: env.GEMMA_FALLBACK_MODEL || 'gemma-4-26b-a4b-it',
    timeoutMs: Number(env.GEMMA_TIMEOUT_MS || 60000),
  },
  githubToken: env.GITHUB_TOKEN || '',
};
