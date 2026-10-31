# Tech Stack

Guiding principle: **fast to build, easy to demo, minimal dependencies.**
Runtime npm dependencies: `next`, `react`, `react-dom`, `@google/genai`. Nothing else.

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | **Node.js ≥ 20** (ESM) | Built-in `fetch`, `crypto` ed25519, `node:test` — no extra libs |
| Framework | **Next.js 16 (App Router)** | One app for UI + backend; route handlers in `app/api/*/route.js` run on Node runtime; loads `.env` natively |
| Frontend | **React 19** client components + one CSS file | No UI kit; `<input webkitdirectory>` for folder upload |
| AI | **Google Gemma 4** (`gemma-4-31b-it`) via **`@google/genai`** (Gemini API) | Track requirement; open model, good at code explanation |
| AI fallback | `GEMMA_FALLBACK_MODEL` (smaller Gemma 4) → deterministic template text | Demo never breaks on quota/timeout/no key |
| Vulnerability data | **OSV.dev API** (`/v1/querybatch`, `/v1/vulns/{id}`) | Free, no key, covers npm + PyPI, includes OpenSSF `MAL-*` malicious-package reports |
| Threat intel warehouse | **Snowflake** (SQL API v2, PAT auth) + **CoCo (Cortex Code)** to author the pipeline | Track requirement; tracks compromised packages + publishing anomalies |
| Threat intel fallback | `data/compromised_packages.json` | Same columns as the Snowflake table; works offline |
| Repo source | **GitHub REST API** (`/repos`, `/git/trees?recursive=1`, raw contents) | Public repos with no token; optional `GITHUB_TOKEN` for rate limits |
| Blockchain | **Solana devnet**, **SPL Memo program** | Cheapest way to write an immutable, timestamped, signed record |
| Solana client | In-repo: `src/solana/` (ed25519 via `node:crypto`, base58, legacy tx serializer, JSON-RPC) | Zero dependencies, fully auditable (~200 LOC) |
| Agent identity | ed25519 keypair (`.keys/agent.json`, Solana CLI format) + registration memo | Same key signs every proof → verifiable reputation history |
| Tests | `node:test` + fixtures (mock "trap" repos written with Copilot) | Zero config |
| Dev tooling | **GitHub Copilot** | Track requirement: mock malicious scripts + test generation |

## Environment variables

| Var | Required | Default | Purpose |
|-----|----------|---------|---------|
| `PORT` | no | `3000` | HTTP port |
| `GEMINI_API_KEY` | for AI | — | Gemma 4 access |
| `GEMMA_MODEL` | no | `gemma-4-31b-it` | Primary model id |
| `GEMMA_FALLBACK_MODEL` | no | `gemma-4-26b-a4b-it` | Tried if primary errors/times out; then template fallback |
| `GITHUB_TOKEN` | no | — | Higher GitHub rate limit / private repos |
| `SOLANA_RPC_URL` | no | `https://api.devnet.solana.com` | RPC endpoint |
| `SOLANA_KEYPAIR` | no | `.keys/agent.json` | Agent keypair path |
| `AUTO_PROOF` | no | `true` | Record a proof after every scan |
| `SNOWFLAKE_ACCOUNT` | no | — | e.g. `orgname-acctname` |
| `SNOWFLAKE_PAT` | no | — | Programmatic access token |
| `SNOWFLAKE_WAREHOUSE` / `_DATABASE` / `_SCHEMA` / `_ROLE` | no | `COMPUTE_WH` / `CODE_MUHAFIZ` / `INTEL` / — | Query context |

## Explicitly NOT used (and why)

- **`@solana/web3.js`** — would add ~50 transitive deps to a *supply-chain security* tool. Ironic. We hand-roll the 3 RPC calls we need.
- **Separate Express backend** — Next.js route handlers are enough.
- **UI kits / state libraries / ORMs** — no over-engineering.
- **Database** — reports are JSON files in `data/reports/`; good enough for MVP.
- **Running `npm install` on scanned repos** — never execute untrusted code.
