# Tech Stack

Guiding principle: **fast to build, easy to demo, minimal dependencies.**
Runtime npm dependencies: `next`, `react`, `react-dom`, `@google/genai`, `@anthropic-ai/sdk`. Nothing else.

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | **Node.js ≥ 20** (ESM) | Built-in `fetch`, `crypto` ed25519, `node:test` — no extra libs |
| Framework | **Next.js 16 (App Router)** | One app for UI + backend; route handlers in `app/api/*/route.js` run on Node runtime; loads `.env` natively |
| Frontend | **React 19** client components + one CSS file | No UI kit; `<input webkitdirectory>` for folder upload |
| AI | **Google Gemma 4** (`gemma-4-31b-it`) via **`@google/genai`** (Gemini API) | Track requirement; open model, good at code explanation |
| AI fallback | Gemma models race → **Claude Sonnet 5.5** (`claude-sonnet-5-5`) via `@anthropic-ai/sdk` → deterministic template text | Demo never breaks on quota/timeout/no key |
| Vulnerability data | **OSV.dev API** (`/v1/querybatch`, `/v1/vulns/{id}`) | Free, no key, covers npm + PyPI, includes OpenSSF `MAL-*` malicious-package reports |
| Threat intel warehouse | **Snowflake** (SQL API v2, PAT auth) + **CoCo (Cortex Code)** to author the pipeline | Track requirement; tracks compromised packages + publishing anomalies |
| Threat intel fallback | `data/compromised_packages.json` | Same columns as the Snowflake table; works offline |
| Repo source | **GitHub REST API** (`/repos`, `/git/trees?recursive=1`, raw contents) | Public repos with no token; optional `GITHUB_TOKEN` for rate limits |
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
| `ANTHROPIC_API_KEY` | no | — | Enables the Claude fallback |
| `ANTHROPIC_MODEL` | no | `claude-sonnet-5-5` | Fallback model id |
| `ANTHROPIC_TIMEOUT_MS` | no | `45000` | Per-request timeout |
| `SNOWFLAKE_ACCOUNT` | no | — | e.g. `orgname-acctname` |
| `SNOWFLAKE_PAT` | no | — | Programmatic access token |
| `SNOWFLAKE_WAREHOUSE` / `_DATABASE` / `_SCHEMA` / `_ROLE` | no | `COMPUTE_WH` / `CODE_MUHAFIZ` / `INTEL` / — | Query context |

## Explicitly NOT used (and why)

- **Separate Express backend** — Next.js route handlers are enough.
- **UI kits / state libraries / ORMs** — no over-engineering.
- **Database** — reports are JSON files in `data/reports/`; good enough for MVP.
- **Running `npm install` on scanned repos** — never execute untrusted code.
