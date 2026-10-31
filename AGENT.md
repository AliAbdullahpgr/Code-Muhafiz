# AGENT.md — Code-Muhafiz (DepSentry)

Instructions for AI coding agents (Copilot, Claude, Gemini, etc.) and humans working on this repo.
Read this first, then `plan/` for details.

## What this project is

**Code-Muhafiz** ("code guardian") is an autonomous AI security agent for the
Hacktoberfest 2026 (AWS SBG × MLH, Multan) **Challenge 2: Open-Source "Dependency Trap" Code Guard**.

It:

1. **Ingests** a codebase — from a public GitHub repo URL (GitHub connector) or a folder uploaded from the browser (or a local path via CLI).
2. **Parses** dependency manifests (`package.json`, `package-lock.json`, `requirements*.txt`), including deep transitive deps from lockfiles and `node_modules/**/package.json`.
3. **Detects** risk:
   - Known vulnerabilities and known-malicious packages (`MAL-*`) from **OSV.dev**.
   - Compromised packages from a **Snowflake** threat-intel table (local snapshot fallback).
   - **Typosquats** of popular packages.
   - Dangerous **install scripts** (`preinstall`/`postinstall`).
   - **Suspicious code** patterns (obfuscated `eval`, env-var exfiltration, credential-file reads, `curl | sh`, webhooks).
4. **Explains** findings in plain language for junior devs using **Google Gemma 4** (`@google/genai`), with **Anthropic Claude Sonnet 5.5** (`@anthropic-ai/sdk`) as fallback.
5. **Fingerprints** every report with a SHA-256 hash of its findings so a saved result can be checked for tampering.

## Golden rules

- **MVP first.** This is a hackathon prototype. Prefer working, readable code over hardening.
- **No new runtime dependencies** unless truly needed. The AI clients are `@google/genai` and `@anthropic-ai/sdk`.
- **No over-engineering.** Next.js App Router does both UI and backend (route handlers in `app/api/`). No separate Express server, no DB, no state library.
- **Every external service must degrade gracefully**:
  - AI fallback chain: Gemma (`GEMMA_MODEL` raced with `GEMMA_FALLBACK_MODEL`) → Claude (`ANTHROPIC_MODEL`, default `claude-sonnet-5-5`, needs `ANTHROPIC_API_KEY`) → template explanations.
  - No Snowflake creds → `data/compromised_packages.json` snapshot.
  - OSV/GitHub unreachable → scan still completes with heuristic findings and a warning.
- **Never execute scanned code.** We only read text. No `npm install`, no `require()` of scanned files.
- **Secrets** live in `.env` (both git-ignored). Never log or commit them.
- ESM only (`"type": "module"`), Node ≥ 20. Next.js 16 + React 19. Use built-in `fetch`, `node:test`.

## Layout

```
app/                      Next.js App Router: page.js (UI), layout.js
app/api/**/route.js       backend route handlers (scan, summary, explain)
src/config.js             env config
src/scanner.js            pipeline orchestrator (ingest → parse → detect → score → AI → hash)
src/ingest/               github.js (connector), local.js (dir walk), files.js (filters)
src/parsers/              manifest parsers → normalized Dependency[]
src/detectors/            osv.js, threatintel.js, typosquat.js, patterns.js, scoring.js
src/intel/snowflake.js    Snowflake SQL API client (PAT auth)
src/ai/gemma.js           Gemma 4 → Claude → template summaries + per-finding explanations
src/store.js              report persistence (data/reports) + simulated ledger
scripts/                  scan.js (CLI)
snowflake/                SQL: schema, OSV load pipeline, anomaly views (CoCo-assisted)
test/                     node:test suites + fixtures (mock vulnerable/malicious repos)
plan/                     product + technical docs
```

## Commands

```bash
npm install
cp .env.example .env    # fill GEMINI_API_KEY (and ANTHROPIC_API_KEY for the fallback)
npm run dev             # http://localhost:3000
npm test                # offline test-suite
npm run scan -- https://github.com/owner/repo     # CLI scan
npm run scan -- ./test/fixtures/trap-app --offline
```

## Core data shapes (keep stable)

```js
// Dependency
{ name, version, range, ecosystem: 'npm'|'PyPI', file, direct: bool, depth, dev: bool }

// Finding
{ id, type: 'vulnerability'|'malicious'|'typosquat'|'install-script'|'suspicious-code',
  severity: 'critical'|'high'|'medium'|'low', title, description,
  package?, version?, ecosystem?, file?, line?, evidence?, source, references: [], fix? }

```

See `plan/DATA_MODEL.md`.

## Conventions

- One responsibility per module; detectors are pure functions `(deps, files) => Finding[]` where possible.
- Add a fixture + test for every new detector rule (`test/fixtures/`).
- Keep the UI simple: plain React client components + one CSS file, no UI kit.
- Commit style: Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
