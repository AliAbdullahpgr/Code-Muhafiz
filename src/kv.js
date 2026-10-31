// Minimal Upstash Redis REST client (plain fetch, no SDK). Used on Vercel, where the filesystem is
// read-only/ephemeral. Enabled when Vercel's Upstash integration env vars are present.
import { config } from './config.js';

export const kvEnabled = () => Boolean(config.kv.url && config.kv.token);

// kv('SET', 'key', 'value') → result
export async function kv(...command) {
  const res = await fetch(config.kv.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.kv.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`Redis ${command[0]} failed: ${data.error || res.status}`);
  return data.result;
}
