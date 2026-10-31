// Risk score (DETECTION_RULES "Scoring").
const WEIGHTS = { critical: 40, high: 20, medium: 7, low: 2 };

export function scoreFindings(findings = []) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) if (f.severity in counts) counts[f.severity]++;
  const raw = Object.entries(counts).reduce((sum, [sev, n]) => sum + WEIGHTS[sev] * n, 0);
  const score = Math.min(100, raw);
  const level = score === 0 ? 'safe' : score < 15 ? 'low' : score < 40 ? 'medium' : score < 70 ? 'high' : 'critical';
  return { score, level, counts };
}
