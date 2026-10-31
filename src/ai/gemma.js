// Gemma 4 (via @google/genai) — executive summaries + per-finding explanations for junior devs.
// Fallback chain: config.gemini.model → config.gemini.fallbackModel → deterministic template.
import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const MAX_SUMMARY_FINDINGS = 8;
const MAX_EVIDENCE_CHARS = 400;

let client = null;
function getClient() {
  if (!client) client = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  return client;
}

export function aiStatus() {
  return { enabled: Boolean(config.gemini.apiKey), model: config.gemini.model };
}

// ---------- public API ----------

export async function summarizeReport(report) {
  const top = topFindings(report?.findings || []);
  const prompt = buildSummaryPrompt(report || {}, top);
  const ai = await generateWithFallback(prompt);
  if (ai) return { mode: 'gemma', model: ai.model, summary: ai.text };
  return { mode: 'fallback', model: 'template', summary: templateSummary(report || {}, top) };
}

export async function explainFinding(finding) {
  const prompt = buildExplainPrompt(finding || {});
  const ai = await generateWithFallback(prompt);
  if (ai) return { mode: 'gemma', model: ai.model, explanation: ai.text };
  return { mode: 'fallback', model: 'template', explanation: templateExplanation(finding || {}) };
}

// ---------- model calls ----------

// Both models race in parallel (Gemma is often overloaded); the first non-empty answer wins.
async function generateWithFallback(prompt) {
  if (!config.gemini.apiKey) return null;
  const models = [...new Set([config.gemini.model, config.gemini.fallbackModel].filter(Boolean))];
  const attempts = models.map(async (model) => {
    try {
      const text = await callModel(model, prompt);
      if (text) return { model, text };
      console.warn(`[gemma] ${model} returned empty text`);
    } catch (err) {
      console.warn(`[gemma] ${model} failed: ${err?.message || err}`);
    }
    throw new Error(`${model} gave no answer`);
  });
  try {
    return await Promise.any(attempts);
  } catch {
    return null;
  }
}

async function callModel(model, prompt) {
  const controller = new AbortController();
  const timeoutMs = config.gemini.timeoutMs;
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`timed out after ${timeoutMs} ms`));
    }, timeoutMs);
  });
  try {
    const request = getClient().models.generateContent({
      model,
      contents: prompt,
      config: { temperature: 0.3, maxOutputTokens: 8192, abortSignal: controller.signal },
    });
    const response = await Promise.race([request, timeout]);
    return cleanText(extractText(response));
  } finally {
    clearTimeout(timer);
  }
}

// Prefer non-thought parts; fall back to response.text.
function extractText(response) {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  const answer = parts.filter((p) => p.text && !p.thought).map((p) => p.text).join('');
  return answer || response?.text || '';
}

// Strip any thinking/reasoning preamble Gemma may emit inline.
function cleanText(text) {
  return String(text || '')
    .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '')
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/<\|channel\|?>thought[\s\S]*?<\|?channel\|>/gi, '')
    .replace(/^\s*(thought|thinking)\s*:?[\s\S]*?\n(?=#|\*\*|- )/i, '')
    .trim();
}

// ---------- prompts ----------

const SYSTEM = `You are a senior application-security engineer explaining a dependency / supply-chain scan to junior developers.
Be accurate, concrete and brief. Use short, scannable Markdown (headings, bullets, inline code). No preamble, no thinking out loud.
Only discuss the findings provided below — never invent packages, CVEs, or findings that are not listed.`;

function topFindings(findings) {
  return [...findings]
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))
    .slice(0, MAX_SUMMARY_FINDINGS);
}

function clip(s, n = MAX_EVIDENCE_CHARS) {
  s = String(s ?? '');
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function describeFinding(f, i) {
  const lines = [
    `### Finding ${i + 1}: [${(f.severity || 'unknown').toUpperCase()}] ${f.title || f.type}`,
    `- type: ${f.type}`,
  ];
  if (f.package) lines.push(`- package: ${f.package}${f.version ? '@' + f.version : ''}`);
  if (f.file) lines.push(`- location: ${f.file}${f.line ? ':' + f.line : ''}`);
  if (f.description) lines.push(`- detector note: ${clip(f.description)}`);
  if (f.fix) lines.push(`- suggested fix: ${clip(f.fix, 200)}`);
  if (f.evidence) lines.push('- evidence (raw code / data):', '```', clip(f.evidence), '```');
  return lines.join('\n');
}

function buildSummaryPrompt(report, top) {
  const s = report.summary || {};
  const c = s.counts || {};
  const total = (report.findings || []).length;
  const header = `Scan target: ${report.target || 'unknown'}
Risk score: ${s.score ?? 'n/a'}/100 (level: ${s.level || 'n/a'})
Finding counts: critical ${c.critical || 0}, high ${c.high || 0}, medium ${c.medium || 0}, low ${c.low || 0} (total ${total})`;

  if (!top.length) {
    return `${SYSTEM}

${header}

There are ZERO findings. Write a 3–5 line "looks clean" summary: state the verdict, note that a clean scan is not a guarantee, and give 2 short habits to stay safe (pin versions / commit lockfiles, review install scripts).`;
  }

  return `${SYSTEM}

${header}

Write the executive summary in this shape:
1. **Verdict** — one or two sentences: is it safe to ship/install, and the single most urgent action.
2. **Top findings** — for each finding below (most severe first), a short section with: what it is, why it's dangerous (refer to the actual evidence lines — explain what that code does), and how to fix it (concrete command or change).
3. **Next steps** — at most 3 bullets.
Keep the whole thing under ~350 words.${total > top.length ? `\nOnly the top ${top.length} of ${total} findings are shown; mention that the rest are in the full report.` : ''}

${top.map(describeFinding).join('\n\n')}`;
}

function buildExplainPrompt(f) {
  return `${SYSTEM}

Give a deep-dive explanation of this single finding for a junior developer, with these Markdown sections:
## What it is
## Why it's dangerous
(explain what the evidence code/data actually does, line by line if useful)
## How to fix it
(concrete commands or code changes)
## How to avoid it next time
Keep it under ~300 words.

${describeFinding(f, 0)}`;
}

// ---------- deterministic template fallback ----------

const TYPE_TEXT = {
  vulnerability: {
    why: 'A publicly known vulnerability exists in this version; attackers can look up and reuse public exploits.',
    fix: 'Upgrade to a patched version and re-run the scan.',
    avoid: 'Run a dependency audit in CI and keep dependencies up to date.',
  },
  malicious: {
    why: 'This package version is known to contain malicious code (e.g. credential theft or backdoors). Installing it can compromise your machine and CI secrets.',
    fix: 'Remove it immediately, delete node_modules and the lockfile entry, reinstall a known-good version, and rotate any secrets that were present where it was installed.',
    avoid: 'Pin exact versions, commit lockfiles, and check new dependencies against threat-intel feeds before adding them.',
  },
  typosquat: {
    why: 'The name closely imitates a popular package. Typosquats are a classic way to trick developers into installing malware.',
    fix: 'Replace it with the intended, legitimate package and check whether the impostor ran any install scripts.',
    avoid: 'Copy package names from official docs, and double-check spelling before `npm install`.',
  },
  'install-script': {
    why: 'Install scripts (preinstall/postinstall) run automatically with your user permissions during `npm install` — a common malware delivery path.',
    fix: 'Review the script; if it is not clearly needed, remove the package or install with `--ignore-scripts`.',
    avoid: 'Use `npm config set ignore-scripts true` by default and allow scripts only for trusted packages.',
  },
  'suspicious-code': {
    why: 'The code uses patterns typical of malware (obfuscated eval, reading secrets, sending data to remote hosts, piping downloads into a shell).',
    fix: 'Inspect the flagged lines; if they are not legitimate, remove the package/code and rotate any exposed credentials.',
    avoid: 'Review diffs of dependency updates and avoid packages that ship minified or obfuscated install-time code.',
  },
};
const DEFAULT_TEXT = {
  why: 'This pattern is associated with supply-chain risk.',
  fix: 'Review the flagged package or file and remove or upgrade it.',
  avoid: 'Keep dependencies minimal, pinned and reviewed.',
};

function label(f) {
  const pkg = f.package ? `\`${f.package}${f.version ? '@' + f.version : ''}\`` : '';
  const loc = f.file ? ` (${f.file}${f.line ? ':' + f.line : ''})` : '';
  return `${f.title || f.type}${pkg ? ' — ' + pkg : ''}${loc}`;
}

function templateSummary(report, top) {
  const s = report.summary || {};
  const c = s.counts || {};
  const total = (report.findings || []).length;
  if (!total) {
    return `**Verdict:** Looks clean — no risky dependencies or suspicious code were found${report.target ? ` in \`${report.target}\`` : ''}.\n\nA clean scan is not a guarantee: keep lockfiles committed, pin versions, and re-scan when dependencies change.\n\n_AI summary unavailable — template text._`;
  }
  const urgent = (c.critical || 0) + (c.high || 0);
  const verdict = urgent
    ? `Do **not** ship as-is: ${urgent} critical/high issue(s) need attention first.`
    : 'No critical issues, but review the findings below.';
  const out = [
    `**Verdict:** Risk score ${s.score ?? 'n/a'}/100 (${s.level || 'n/a'}). ${verdict}`,
    `Counts — critical ${c.critical || 0}, high ${c.high || 0}, medium ${c.medium || 0}, low ${c.low || 0}.`,
    '',
    '### Top findings',
  ];
  for (const f of top) {
    const t = TYPE_TEXT[f.type] || DEFAULT_TEXT;
    out.push(`- **[${(f.severity || '?').toUpperCase()}] ${label(f)}**`);
    out.push(`  - Why it matters: ${f.description || t.why}`);
    if (f.evidence) out.push(`  - Evidence: \`${clip(f.evidence, 160).replace(/`/g, "'").replace(/\s+/g, ' ')}\``);
    out.push(`  - Fix: ${f.fix || t.fix}`);
  }
  if (total > top.length) out.push('', `_${total - top.length} more finding(s) in the full report._`);
  out.push('', '_AI summary unavailable — template text._');
  return out.join('\n');
}

function templateExplanation(f) {
  const t = TYPE_TEXT[f.type] || DEFAULT_TEXT;
  const out = [
    '## What it is',
    `${label(f)}. ${f.description || ''}`.trim(),
    '',
    "## Why it's dangerous",
    t.why,
  ];
  if (f.evidence) out.push('', 'Evidence:', '```', clip(f.evidence), '```');
  out.push('', '## How to fix it', f.fix || t.fix, '', '## How to avoid it next time', t.avoid);
  out.push('', '_AI explanation unavailable — template text._');
  return out.join('\n');
}
