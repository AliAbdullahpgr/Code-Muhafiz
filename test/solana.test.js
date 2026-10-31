import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { encode, decode } from '../src/solana/base58.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-solana-'));
process.env.SOLANA_KEYPAIR = path.join(tmp, 'agent.json');
process.env.LEDGER_PATH = path.join(tmp, 'ledger.json');
const agent = await import('../src/solana/agent.js');

test('base58 round-trips, including leading zeros', () => {
  for (const bytes of [new Uint8Array([]), new Uint8Array([0, 0, 1, 2, 255]), crypto.randomBytes(64)]) {
    assert.deepEqual([...decode(encode(bytes))], [...bytes]);
  }
  assert.equal(encode(Buffer.from('hello world')), 'StV1DL6CwTryKyV');
});

const fakeReport = () => ({
  scanId: 'abcdef123456', createdAt: '2026-10-31T00:00:00.000Z', target: 'github.com/acme/app',
  agent: 'code-muhafiz@0.1.0', summary: { score: 42, level: 'high', counts: { critical: 1, high: 2, medium: 0, low: 1 } },
  findings: [{ id: 'f-1', type: 'typosquat', severity: 'critical', package: 'expresss', version: '1.0.0', ruleId: 'TYPO', file: 'package.json', line: 3 }],
  proof: null,
});

test('agent keypair is created in Solana CLI format and registration is idempotent', async () => {
  const a = await agent.registerAgent();
  const b = await agent.registerAgent();
  assert.equal(a.registered, true);
  assert.equal(a.registrationSignature, b.registrationSignature);
  assert.equal(decode(a.publicKey).length, 32);
  assert.equal(JSON.parse(fs.readFileSync(process.env.SOLANA_KEYPAIR, 'utf8')).length, 64);
});

test('record + verify a report proof; tampering breaks hashMatches', async () => {
  const report = fakeReport();
  report.proof = await agent.recordProof(report);
  assert.equal(report.proof.mode, 'simulated');
  const ok = await agent.verifyProof(report);
  assert.equal(ok.valid, true);
  assert.deepEqual(ok.checks, { hashMatches: true, signerIsAgent: true, onChain: false, chainIntact: true });

  report.summary.counts.critical = 0;
  const bad = await agent.verifyProof(report);
  assert.equal(bad.checks.hashMatches, false);
  assert.equal(bad.valid, false);

  const history = await agent.getHistory();
  assert.equal(history[0].signature, report.proof.signature);
  assert.ok(history.length >= 2);
});
