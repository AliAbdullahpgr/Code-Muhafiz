// Agent identity + proof ledger. SIMULATED mode: real ed25519 signatures over the memo, stored in a
// local append-only hash-chained ledger (data/ledger.json). A devnet mode (Memo program tx) can be
// added later behind the same exports: getAgent, registerAgent, recordProof, verifyProof, getHistory.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { kv, kvEnabled } from '../kv.js';
import { hashReport } from '../scanner.js';
import { encode as b58encode, decode as b58decode } from './base58.js';

const GENESIS = '0'.repeat(64);
const PROTOCOL = 'code-muhafiz';

// Read env per call so tests (and future config) can redirect storage.
// Key source order: AGENT_KEYPAIR env (JSON array, Solana CLI format) → Redis → file.
const keypairPath = () => path.resolve(process.env.SOLANA_KEYPAIR || path.join(config.dataDir, '..', '.keys', 'agent.json'));
const ledgerPath = () => path.resolve(process.env.LEDGER_PATH || path.join(config.dataDir, 'ledger.json'));

function generateKeypairBytes() {
  const { privateKey } = crypto.generateKeyPairSync('ed25519');
  const jwk = privateKey.export({ format: 'jwk' });
  return Uint8Array.from([...Buffer.from(jwk.d, 'base64url'), ...Buffer.from(jwk.x, 'base64url')]);
}

async function readKeypairBytes(file) {
  if (process.env.AGENT_KEYPAIR) return Uint8Array.from(JSON.parse(process.env.AGENT_KEYPAIR));
  if (kvEnabled()) {
    // SET NX: the first instance to boot creates the identity; every instance after reuses it.
    await kv('SET', 'agent:keypair', JSON.stringify([...generateKeypairBytes()]), 'NX');
    return Uint8Array.from(JSON.parse(await kv('GET', 'agent:keypair')));
  }
  try {
    return Uint8Array.from(JSON.parse(await fs.readFile(file, 'utf8')));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    const bytes = generateKeypairBytes();
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify([...bytes]), { mode: 0o600 });
    return bytes;
  }
}

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// ---- identity ----------------------------------------------------------------------------

let cached = null; // { path, privateKey, publicKey (KeyObject), pubkeyBytes, address }

async function loadKeypair() {
  const file = keypairPath();
  if (cached?.path === file) return cached;
  const bytes = await readKeypairBytes(file);
  if (bytes.length !== 64) throw new Error('Agent keypair must be 64 bytes');
  const seed = bytes.subarray(0, 32);
  const pub = bytes.subarray(32, 64);
  const privateKey = crypto.createPrivateKey({ key: { kty: 'OKP', crv: 'Ed25519', d: b64u(seed), x: b64u(pub) }, format: 'jwk' });
  cached = { path: file, privateKey, pubkeyBytes: pub, address: b58encode(pub) };
  return cached;
}

function publicKeyFromAddress(address) {
  return crypto.createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: b64u(b58decode(address)) }, format: 'jwk' });
}

// ---- ledger ------------------------------------------------------------------------------

async function readLedger() {
  if (kvEnabled()) return ((await kv('LRANGE', 'ledger', 0, -1)) || []).map((s) => JSON.parse(s));
  try {
    const data = JSON.parse(await fs.readFile(ledgerPath(), 'utf8'));
    return Array.isArray(data) ? data : data.entries || [];
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

async function appendMemo(memo) {
  const kp = await loadKeypair();
  const signature = b58encode(crypto.sign(null, Buffer.from(memo, 'utf8'), kp.privateKey));
  const makeEntry = (prevHash) =>
    ({ signature, memo, timestamp: new Date().toISOString(), prevHash, entryHash: sha256(prevHash + signature), signer: kp.address });

  if (kvEnabled()) {
    const last = await kv('LINDEX', 'ledger', -1);
    const entry = makeEntry(last ? JSON.parse(last).entryHash : GENESIS);
    await kv('RPUSH', 'ledger', JSON.stringify(entry));
    return entry;
  }

  const entries = await readLedger();
  const entry = makeEntry(entries.length ? entries[entries.length - 1].entryHash : GENESIS);
  entries.push(entry);
  await fs.mkdir(path.dirname(ledgerPath()), { recursive: true });
  await fs.writeFile(ledgerPath(), JSON.stringify(entries, null, 2));
  return entry;
}

const parseMemo = (memo) => { try { return JSON.parse(memo); } catch { return null; } };

// ---- public API --------------------------------------------------------------------------

export async function getAgent() {
  const kp = await loadKeypair();
  const reg = (await readLedger()).find((e) => e.signer === kp.address && parseMemo(e.memo)?.t === 'agent_register');
  return {
    publicKey: kp.address, balance: 0, mode: 'simulated',
    registered: Boolean(reg), registrationSignature: reg?.signature || null,
  };
}

export async function registerAgent() {
  const agent = await getAgent();
  if (agent.registered) return agent;
  await appendMemo(JSON.stringify({
    p: PROTOCOL, v: 1, t: 'agent_register', name: 'code-muhafiz', version: '0.1.0',
    capabilities: ['dependency-scan', 'typosquat', 'osv', 'gemma-explain'],
  }));
  return getAgent();
}

export async function recordProof(report) {
  const kp = await loadKeypair();
  const reportHash = hashReport(report);
  const c = report.summary?.counts || {};
  const memo = JSON.stringify({
    p: PROTOCOL, v: 1, t: 'audit', scan: report.scanId, target: report.target, h: reportHash,
    risk: report.summary?.level, f: { c: c.critical || 0, h: c.high || 0, m: c.medium || 0, l: c.low || 0 },
  });
  const entry = await appendMemo(memo);
  return {
    mode: 'simulated', signature: entry.signature, reportHash, agent: kp.address, memo,
    explorerUrl: null, timestamp: entry.timestamp, prevHash: entry.prevHash,
  };
}

export async function verifyProof(report) {
  const reportHash = hashReport(report);
  const proof = report.proof;
  const result = (checks, onChainMemo = null) => ({
    valid: checks.hashMatches && checks.signerIsAgent && checks.chainIntact,
    mode: proof?.mode || 'simulated', checks, reportHash, onChainMemo, explorerUrl: null,
  });
  const none = { hashMatches: false, signerIsAgent: false, onChain: false, chainIntact: false };
  if (!proof?.signature) return result(none);

  const entries = await readLedger();
  const idx = entries.findIndex((e) => e.signature === proof.signature);
  if (idx < 0) return result(none);
  const entry = entries[idx];
  const kp = await loadKeypair();

  let signerIsAgent = false;
  try {
    signerIsAgent = crypto.verify(null, Buffer.from(entry.memo, 'utf8'), publicKeyFromAddress(kp.address), Buffer.from(b58decode(entry.signature)));
  } catch { signerIsAgent = false; }

  const expectedPrev = idx === 0 ? GENESIS : entries[idx - 1].entryHash;
  const chainIntact = entry.prevHash === expectedPrev && entry.entryHash === sha256(entry.prevHash + entry.signature);
  const hashMatches = parseMemo(entry.memo)?.h === reportHash;

  return result({ hashMatches, signerIsAgent, onChain: false, chainIntact }, entry.memo);
}

export async function getHistory() {
  return (await readLedger()).slice().reverse().map(({ signature, memo, timestamp }) => ({ signature, memo, timestamp }));
}
