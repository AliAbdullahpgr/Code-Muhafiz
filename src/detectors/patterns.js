// Install-script (§4) and suspicious-code (§5) detectors. Text-only: never executes scanned code.

const MAX_BYTES = 500 * 1024;
const CODE_EXT = /\.(js|mjs|cjs|ts|py|sh)$/i;
const INSTALL_HOOKS = ['preinstall', 'install', 'postinstall'];
const DANGEROUS_SCRIPT = /curl|wget|\|\s*(ba)?sh\b|powershell|base64|eval|node\s+-e|https?:\/\//i;

const tooBig = (content) => typeof content !== 'string' || content.length > MAX_BYTES;

function snippet(text) {
  const s = String(text).trim().replace(/\s+/g, ' ');
  return s.length > 160 ? s.slice(0, 157) + '...' : s;
}

/** 1-based line number + trimmed line text for the first match of `re` in `content`. */
function locate(content, re) {
  const m = re.exec(content);
  if (!m) return null;
  const before = content.slice(0, m.index);
  const line = before.split('\n').length;
  const lineText = content.split('\n')[line - 1] ?? m[0];
  return { line, evidence: snippet(lineText) };
}

// Package name from node_modules/<name>/package.json or node_modules/@scope/name/package.json.
function packageFromPath(p) {
  const m = p.match(/(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)\/package\.json$/);
  return m ? m[1] : null;
}

export function detectInstallScripts(files = []) {
  const findings = [];
  for (const { path, content } of files) {
    if (!/(^|\/)package\.json$/.test(path) || tooBig(content)) continue;
    let pkg;
    try {
      pkg = JSON.parse(content);
    } catch {
      continue;
    }
    const scripts = pkg && typeof pkg.scripts === 'object' ? pkg.scripts : null;
    if (!scripts) continue;

    const depName = packageFromPath(path);
    const isDep = Boolean(depName);
    const name = depName || pkg.name || 'root project';

    for (const hook of INSTALL_HOOKS) {
      const cmd = scripts[hook];
      if (typeof cmd !== 'string' || !cmd.trim()) continue;
      const dangerous = DANGEROUS_SCRIPT.test(cmd);
      const severity = dangerous ? 'high' : isDep ? 'medium' : 'low';
      const loc = locate(content, new RegExp(`"${hook}"\\s*:`));
      findings.push({
        type: 'install-script',
        severity,
        title: `${dangerous ? 'Dangerous' : 'Install'} "${hook}" script in ${isDep ? `dependency ${name}` : 'project package.json'}`,
        description:
          `"${hook}" runs automatically during npm install with your user's permissions.` +
          (dangerous ? ' This script downloads, decodes or evaluates code — a common malware delivery technique.' : '') +
          (isDep ? ' It comes from a third-party dependency.' : ''),
        package: isDep ? name : pkg.name,
        version: pkg.version,
        ecosystem: 'npm',
        file: path,
        line: loc?.line,
        evidence: snippet(`"${hook}": "${cmd}"`),
        source: 'heuristic',
        references: ['https://docs.npmjs.com/cli/using-npm/scripts#ignoring-scripts'],
        fix: isDep ? `Review ${name}; install with --ignore-scripts or remove the dependency` : 'Review the script; avoid network/eval in install hooks',
        ruleId: dangerous ? 'install-script-dangerous' : 'install-script',
      });
    }
  }
  return findings;
}

const NETWORK = /\bfetch\s*\(|https?\.(request|get)\s*\(|\baxios\b|requests\.(post|get)\s*\(|urllib\.request|XMLHttpRequest|net\.connect|\bsocket\.connect/;

// Each rule: id, severity, title, test(content) → regex to locate (or null when it doesn't match).
const RULES = [
  {
    id: 'obfuscated-eval',
    severity: 'high',
    title: 'Obfuscated eval / new Function',
    desc: 'Code is decoded at runtime and executed with eval/new Function, hiding what it really does.',
    test: (c) =>
      /\beval\s*\(|new\s+Function\s*\(/.test(c) && /Buffer\.from|\batob\s*\(|base64|fromCharCode|\\x[0-9a-f]{2}/i.test(c)
        ? /\beval\s*\(|new\s+Function\s*\(/
        : null,
  },
  {
    id: 'env-exfiltration',
    severity: 'high',
    title: 'Environment variables sent over the network',
    desc: 'The file reads environment variables (often API keys/tokens) and also makes network requests.',
    test: (c) => (/process\.env|os\.environ/.test(c) && NETWORK.test(c) ? /process\.env|os\.environ/ : null),
  },
  {
    id: 'credential-file-read',
    severity: 'high',
    title: 'Reads credential files',
    desc: 'The code references files that hold secrets (npm tokens, SSH keys, cloud credentials, wallets).',
    test: (c) => {
      const re = /\.npmrc|\.ssh\/|id_rsa|\.aws\/credentials|\.git-credentials|wallet\.dat/;
      return re.test(c) ? re : null;
    },
  },
  {
    id: 'remote-shell',
    severity: 'high',
    title: 'Downloads and pipes a remote script to a shell',
    desc: 'A remote script is fetched and executed directly — whoever controls that URL controls your machine.',
    test: (c) => {
      const re = /(curl|wget)\b[^\n|]*\|\s*(ba)?sh\b|Invoke-WebRequest[^\n]*\|\s*iex|\biwr\b[^\n]*\|\s*iex/i;
      return re.test(c) ? re : null;
    },
  },
  {
    id: 'exfil-webhook',
    severity: 'high',
    title: 'Known data-exfiltration endpoint',
    desc: 'The code contacts an endpoint commonly used by malware to receive stolen data.',
    test: (c) => {
      const re = /discord(app)?\.com\/api\/webhooks|api\.telegram\.org\/bot|pastebin\.com|ngrok\.io/i;
      return re.test(c) ? re : null;
    },
  },
  {
    id: 'child-process-network',
    severity: 'medium',
    title: 'Spawns processes and uses the network',
    desc: 'The file both runs shell commands (child_process) and makes network calls — a combination used by droppers.',
    test: (c) => (/child_process/.test(c) && NETWORK.test(c) ? /child_process/ : null),
  },
  {
    id: 'long-encoded-blob',
    severity: 'medium',
    title: 'Large encoded blob',
    desc: 'A very long base64/hex string literal is embedded in code, often a hidden payload.',
    test: (c) => {
      const re = /['"`](?:[A-Za-z0-9+/]{400,}={0,2}|(?:\\x)?[0-9a-fA-F]{400,})['"`]/;
      return re.test(c) ? re : null;
    },
  },
  {
    id: 'python-exec-decode',
    severity: 'high',
    title: 'Python exec of decoded payload',
    desc: 'exec() runs code that was decoded/decompressed at runtime, hiding a payload.',
    test: (c) =>
      /\bexec\s*\(/.test(c) && /base64\.b64decode|marshal\.loads|zlib\.decompress/.test(c) ? /\bexec\s*\(/ : null,
  },
];

export function detectSuspiciousCode(files = []) {
  const findings = [];
  for (const { path, content } of files) {
    if (!CODE_EXT.test(path) || tooBig(content)) continue;
    // Innermost node_modules/<pkg>/ segment, if the file lives inside a dependency.
    const depPkg = [...path.matchAll(/node_modules\/((?:@[^/]+\/)?[^/]+)\//g)].pop()?.[1];
    for (const rule of RULES) {
      const re = rule.test(content);
      if (!re) continue;
      const loc = locate(content, re) || {};
      findings.push({
        type: 'suspicious-code',
        severity: rule.severity,
        title: `${rule.title} in ${path}`,
        description: rule.desc + (depPkg ? ` Found inside dependency "${depPkg}".` : ''),
        package: depPkg || undefined,
        file: path,
        line: loc.line,
        evidence: loc.evidence,
        source: 'heuristic',
        references: [],
        fix: depPkg ? `Remove or replace ${depPkg} and rotate any exposed secrets` : 'Review this code; remove it if you did not write it',
        ruleId: rule.id,
      });
    }
  }
  return findings;
}
