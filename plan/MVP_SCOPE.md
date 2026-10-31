# MVP Scope

Goal: **a working, demo-able prototype in one hackathon day.** Not hardened.

## In scope ✅

- [x] GitHub connector: public repo URL (`owner/repo`, full URL, `/tree/branch` URLs), optional branch
- [x] Manual folder upload from the browser (incl. `node_modules` package.json files for deep deps)
- [x] CLI scan of a URL or local path
- [x] Parsers: `package.json`, `package-lock.json` (v1/v2/v3), `requirements*.txt`
- [x] OSV.dev vulnerability + malicious-package lookup
- [x] Snowflake threat-intel lookup with offline snapshot fallback + SQL pipeline files
- [x] Typosquat detection
- [x] Install-script and suspicious-code pattern detection
- [x] Risk score
- [x] Gemma 4 executive summary + per-finding "Explain like I'm a junior dev"
- [x] Claude Sonnet 5.5 fallback when Gemma fails
- [x] Test-suite with Copilot-generated "trap" fixtures
- [x] README with license block + Copilot section

## Out of scope ❌ (post-hackathon)

- Private repo OAuth app, GitHub App / PR comments / webhooks
- yarn.lock, pnpm-lock.yaml, poetry.lock, go.mod, Cargo.lock, Maven
- Exact semver range resolution (we use the minimum version of a range when no lockfile)
- Fetching & scanning tarballs of every transitive dependency from the registry
- Auth, multi-tenant, rate limiting, queueing, DB
- Mainnet

## Build checklist (order)

| # | Task | Owner | Est |
|---|------|-------|-----|
| 1 | Plan docs, AGENT.md, env | all | 0.5h |
| 2 | Parsers + fixtures + tests | dev A | 1h |
| 3 | Detectors (OSV, typosquat, patterns, threat intel) | dev A | 1.5h |
| 4 | GitHub connector + upload ingest | dev B | 1h |
| 5 | Anthropic fallback + report hash | dev B | 0.5h |
| 6 | Gemma integration | dev C | 0.5h |
| 7 | UI | dev C | 1.5h |
| 8 | Snowflake SQL + CoCo pipeline + client | dev C | 1h |
| 9 | README, demo rehearsal | all | 0.5h |

## Definition of done

- `npm test` green.
- Scanning `test/fixtures/trap-app` (upload) finds: OSV vulns in lodash, event-stream malicious,
  `crossenv` typosquat, postinstall `curl | sh`, `eval(Buffer.from(...))`, env exfiltration.
- Scanning a real public GitHub repo works end-to-end.
- If Gemma is unavailable the summary badge reads "Claude" (with `ANTHROPIC_API_KEY`) or "Template".
