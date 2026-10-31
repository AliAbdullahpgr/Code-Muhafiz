# Architecture

## Component diagram

```
                 ┌───────────────────────── Browser (app/page.js) ──────────────────────────┐
                 │  [GitHub URL]   [Upload folder (webkitdirectory)]   Findings · AI · Proof │
                 └───────────────┬───────────────────────┬──────────────────────────────────┘
                                 │ POST /api/scan/github │ POST /api/scan/upload (JSON files[])
                                 ▼                       ▼
┌────────────────────────────── Next.js app/api/* (route handlers) ───────────────────────────────┐
│                                       src/scanner.js                                            │
│  ┌───────────┐   ┌───────────┐   ┌──────────────────────────────────────┐   ┌────────┐ ┌──────┐ │
│  │ ingest/   │──▶│ parsers/  │──▶│ detectors/                           │──▶│ ai/    │▶│solana│ │
│  │ github    │   │ npm, lock │   │ osv ─────────▶ OSV.dev API           │   │ gemma  │ │agent │ │
│  │ upload    │   │ pip       │   │ threatintel ─▶ Snowflake / snapshot  │   └───┬────┘ └──┬───┘ │
│  │ local     │   └───────────┘   │ typosquat, patterns (install+code)   │       │         │     │
│  └─────┬─────┘                   │ scoring                              │       │         │     │
│        │                         └──────────────────────────────────────┘       │         │     │
└────────┼────────────────────────────────────────────────────────────────────────┼─────────┼─────┘
         ▼                                                                        ▼         ▼
   GitHub REST API                                                       Gemini API   Solana devnet
                                                                        (Gemma 4)    (Memo program)
```

## Scan pipeline

1. **Ingest** → `ScanInput { source: 'github'|'upload'|'local', target, files: [{ path, content }] }`
   - GitHub: `GET /repos/{o}/{r}` (default branch) → `GET /git/trees/{branch}?recursive=1` →
     pick manifests + up to 60 small source files → fetch from `raw.githubusercontent.com`.
   - Upload: browser filters the chosen folder client-side (manifests, `node_modules/**/package.json`,
     source files ≤ 200 KB) and posts JSON. Server re-applies the same filter.
2. **Parse** → `Dependency[]` (dedup by ecosystem+name+version). Lockfiles give exact versions and depth.
3. **Detect** (run in parallel):
   - `osv` → batch query, then fetch details for unique vuln IDs. `MAL-*` → `malicious`.
   - `threatintel` → Snowflake `COMPROMISED_PACKAGES` (or snapshot) match on name + version/`*`.
   - `typosquat` → Levenshtein vs popular package list.
   - `patterns` → install scripts in any `package.json`; regex rules on source files.
4. **Score** → 0–100 risk score + level (`safe|low|medium|high|critical`).
5. **Explain** → Gemma 4 writes an executive summary for junior devs (top findings only).
   Per-finding deep explanations are on-demand (`POST /api/explain`).
6. **Prove** → canonical JSON of the report core → SHA-256 → Memo tx signed by agent key →
   `signature` stored in report. Fallback: simulated hash-chained ledger.
7. **Persist** → `data/reports/{scanId}.json`.

## Proof & verification

```
memo = {"p":"code-muhafiz","v":1,"t":"audit","scan":"<id>","target":"<repo>",
        "h":"<sha256>","risk":"high","f":{"c":1,"h":3,"m":2,"l":0}}
```

Verify (`GET /api/proofs/:scanId/verify`):
1. Recompute SHA-256 from the stored report.
2. `getTransaction(signature)` → find memo in `logMessages`.
3. Check memo hash == recomputed hash **and** tx fee-payer == agent public key.

Reputation (`GET /api/agent/history`): `getSignaturesForAddress(agent)` returns every memo the
agent ever signed — the public, untamperable audit log.

## Agent identity

`.keys/agent.json` (64-byte Solana CLI format). `POST /api/agent/register` writes a
`{"t":"agent_register", name, version, capabilities}` memo — the agent's on-chain registration
record. When the official Solana Agent Registry program/SDK is available to the team, swap
`registerAgent()` in `src/solana/agent.js` to call it; proofs stay unchanged.

## Failure modes

| Failure | Behaviour |
|---------|-----------|
| GitHub rate limit (60/h anon) | 4xx with message; set `GITHUB_TOKEN` |
| OSV down | warning in report, heuristic findings still returned |
| Gemma error / no key | retry with `GEMMA_FALLBACK_MODEL`, then template summary (`ai.mode = 'fallback'`) |
| No SOL / no key | `proof.mode = 'simulated'` |
