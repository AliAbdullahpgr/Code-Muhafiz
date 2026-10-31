export const SEVERITIES = ["critical", "high", "medium", "low"];
export const SEV_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

export const SEV_LABEL = { critical: "Critical", high: "High", medium: "Medium", low: "Low", safe: "Safe" };

export const TYPE_LABEL = {
  vulnerability: "Vulnerability",
  malicious: "Malicious Package",
  typosquat: "Typosquat",
  "install-script": "Install Script",
  "suspicious-code": "Suspicious Code",
};

export const AI_LABEL = { gemma: "Gemma 4", anthropic: "Claude", fallback: "Template" };

export const SOURCE_LABEL = { osv: "OSV.dev", snowflake: "Snowflake", snapshot: "Local Snapshot", heuristic: "Heuristic" };

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export function shorten(str, head = 6, tail = 6) {
  if (!str) return "";
  return str.length <= head + tail + 1 ? str : `${str.slice(0, head)}…${str.slice(-tail)}`;
}

export const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function explorerTx(sig) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

export function explorerAddress(addr) {
  return `https://explorer.solana.com/address/${addr}?cluster=devnet`;
}
