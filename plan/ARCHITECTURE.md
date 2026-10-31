# Architecture

## Component diagram

```
                 ┌───────────────────────── Browser (app/page.js) ──────────────────────────┐
                 │  [GitHub URL]   [Upload folder (webkitdirectory)]   Findings · AI · Hash  │
                 └───────────────┬───────────────────────┬──────────────────────────────────┘
                                 │ POST /api/scan/github │ POST /api/scan/upload (JSON files[])
                                 ▼                       ▼
┌────────────────────────────── Next.js app/api/* (route handlers) ───────────────────────────────┐
│                                       src/scanner.js                                            │
│  ┌───────────┐   ┌───────────┐   ┌──────────────────────────────────────┐   ┌────────┐ ┌──────┐ │
│  │ ingest/   │──▶│ parsers/  │──▶│ detectors/                           │──▶│ ai/    │ │      │ │
│  │ github    │   │ npm, lock │   │ osv ─────────▶ OSV.dev API           │   │ gemma  │ │agent │ │
│  │ upload    │   │ pip       │   │ threatintel ─▶ Snowflake / snapshot  │   └───┬────┘ └──┬───┘ │
│  │ local     │   └───────────┘   │ typosquat, patterns (install+code)   │       │         │     │
│  └─────┬─────┘                   │ scoring                              │       │         │     │
│        │                         └──────────────────────────────────────┘       │         │     │
└────────┼────────────────────────────────────────────────────────────────────────┼─────────┼─────┘
         ▼                                                                        ▼         ▼
   GitHub REST API                                                       Gemini API   Anthropic API
                                                                        (Gemma 4)    (Claude fallback)
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
5. **Explain** → Gemma 4 (Claude Sonnet 5.5 as fallback) writes an executive summary for junior devs (top findings only).
   Per-finding deep explanations are on-demand (`POST /api/explain`).
6. **Hash** → canonical JSON of the report core → SHA-256 → `reportHash`.
7. **Persist** → `data/reports/{scanId}.json`.

## Failure modes

| Failure | Behaviour |
|---------|-----------|
| GitHub rate limit (60/h anon) | 4xx with message; set `GITHUB_TOKEN` |
| OSV down | warning in report, heuristic findings still returned |
| Gemma error / no key | Gemma models race; if none answers → Claude Sonnet 5.5 (`ai.mode = 'anthropic'`); if that fails or has no key → template summary (`ai.mode = 'fallback'`) |
