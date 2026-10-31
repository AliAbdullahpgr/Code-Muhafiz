# Code Muhafiz

> *Muhafiz* (محافظ) — "guardian". Catch poisoned packages before they ship.

Code Muhafiz is an open-source "dependency trap" guard. Point it at a public GitHub
repo or drop in a project folder. It reads the dependency manifests, finds
supply-chain risks, and explains each one in plain, junior-developer-friendly language.

Built at **Hacktoberfest Hack Day Multan x AWS Student Builder Group BZU** (Oct 31, 2026)
for *Challenge 2: Open-Source "Dependency Trap" Code Guard*.

## What it does

1. **Ingest** — a public GitHub repo (`owner/repo` or a full URL, optional branch) or a
   folder uploaded from the browser. Scanned code is only read as text, never run.
2. **Parse** — `package.json`, `package-lock.json` (v1/v2/v3), `requirements*.txt`,
   including transitive dependencies from lockfiles and `node_modules/**/package.json`.
3. **Detect** — in seconds, with no AI:
   - known vulnerabilities and malicious packages (`MAL-*`) from **OSV.dev**;
   - compromised packages from a threat-intel list (`data/compromised_packages.json`,
     the offline snapshot of the Snowflake table);
   - **typosquats** of popular packages;
   - dangerous **install scripts** (`preinstall` / `postinstall`);
   - **suspicious code** (obfuscated `eval`, env-var exfiltration, credential-file reads, `curl | sh`, webhooks).
4. **Score** — a 0–100 risk score and level (`safe` … `critical`).
5. **Explain** — findings appear first. A second call then writes the summary, and
   each finding has an **Explain Finding** button.
6. **Fingerprint** — every report carries a SHA-256 hash of its findings.

### AI fallback chain

```
Gemma 4 (gemma-4-31b-it ‖ gemma-4-26b-a4b-it, raced)
   └─ no answer → Claude Sonnet 5.5 (claude-sonnet-5-5, @anthropic-ai/sdk)
         └─ no answer or no key → deterministic template text
```

The UI shows which one wrote each summary (Gemma 4, Claude or Template).
Every external service degrades gracefully. OSV or GitHub being unreachable adds a warning, and the scan still completes.

## Stack

- **Next.js 16** (App Router) + **React 19**. The UI and the API routes are one app.
- Plain React client components and a single CSS file (`app/globals.css`), with no UI kit or state library.
  Styling follows the Firecrawl design system: heat-orange brand, near-neutral surfaces, Light and Dark themes.
- `@google/genai` — Gemma 4 through the Gemini API
- `@anthropic-ai/sdk` — Claude Sonnet 5.5 fallback
- Node ≥ 20, ESM, built-in `fetch` and `node:test`

## Run

```bash
npm install
cp .env.example .env   # add GEMINI_API_KEY (and ANTHROPIC_API_KEY for the fallback)
npm run dev            # http://localhost:3000
```

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Offline test suite (parsers, detectors, …) |
| `npm run scan -- ./test/fixtures/trap-app --offline` | CLI scan of a local folder |
| `npm run scan -- https://github.com/owner/repo` | CLI scan of a GitHub repo |

### Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `GEMINI_API_KEY` | — | Enables Gemma 4 |
| `GEMMA_MODEL` / `GEMMA_FALLBACK_MODEL` | `gemma-4-31b-it` / `gemma-4-26b-a4b-it` | Models raced for each request |
| `GEMMA_TIMEOUT_MS` | `45000` | Per-request timeout |
| `ANTHROPIC_API_KEY` | — | Enables the Claude fallback |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` | Fallback model |
| `ANTHROPIC_TIMEOUT_MS` | `45000` | Per-request timeout |
| `GITHUB_TOKEN` | — | Higher GitHub rate limit |

## Using the app

- **Scan** — on the home page choose **GitHub Repo** or **Upload Folder** (click or drag a folder).
  The browser filters files before upload: manifests, `node_modules/**/package.json`, and
  source files under 200 KB (25 MB max).
- **Report** — risk score, AI summary, filterable findings (severity and type) with
  evidence and fixes, a searchable dependency table, and the report hash.
- **Reports** — recent scans. The last 10 are also kept in your browser.
- **Demo data** — if an API route is not reachable the UI falls back to sample data for it
  and shows a **Demo Data** badge. Set `NEXT_PUBLIC_MOCK=1` to force it.

## API

All bodies are JSON. Full details are in [`plan/API.md`](plan/API.md).

| Route | Purpose |
|-------|---------|
| `GET /api/health` | AI status and enabled providers |
| `POST /api/scan/github` | `{ repo, branch? }` → report |
| `POST /api/scan/upload` | `{ name, files: [{ path, content }] }` → report |
| `POST /api/summary` | `{ scanId }` → AI summary (scans return `ai.mode = "pending"`) |
| `POST /api/explain` | `{ scanId, findingId }` → explanation of one finding |
| `GET /api/reports`, `GET /api/reports/:scanId` | Saved reports (`data/reports/`) |

## Project layout

```
app/                  Next.js App Router: page.js (UI), layout.js, globals.css
app/components/       Header, ScanForm, ScanProgress, ReportView, FindingsPanel, DependenciesPanel, …
app/lib/              api client, demo data, folder ingest, formatting, local history
app/api/**/route.js   backend route handlers
src/                  scanner, ingest, parsers, detectors, ai (Gemma → Claude → template), store
scripts/              CLI scan
data/                 compromised-package snapshot
test/                 node:test suites + the trap-app fixture
plan/                 product and technical docs
```

More detail: [`plan/`](plan/README.md) and [`AGENT.md`](AGENT.md).

## How GitHub Copilot helped

_To be documented with screenshots/logs._

## License

[MIT](LICENSE)
