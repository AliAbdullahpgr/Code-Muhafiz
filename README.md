# Code-Muhafiz

> *Muhafiz* (محافظ) — "guardian". Gemma 4 reads your dependencies so you don't have to.

Code-Muhafiz is an open-source "dependency trap" guard. It scans a project's
dependency manifest for supply-chain risks — known-malicious packages and
typosquats — and uses **Google Gemma 4** to explain each risk in plain,
junior-developer-friendly language.

Built at **Hacktoberfest Hack Day Multan x AWS Student Builder Group BZU** (Oct 31, 2026)
for *Challenge 2: Open-Source "Dependency Trap" Code Guard*.

## Plan

1. **Input** — paste or upload a `package.json` or `requirements.txt` on the web page.
2. **Instant scan** (no AI, milliseconds):
   - match every dependency against a known-compromised package list
     (`data/`, standing in for a Snowflake/CoCo vulnerability dataset);
   - flag typosquats — names one edit away from popular packages
     (e.g. `expresss`, `reqeusts`).
3. **Gemma 4 explanation** — the `/api/scan` route sends all findings to `gemma-4-31b-it` via the Gemini
   API in **one** batched request, streamed to the page (a single call takes
   ~30 s, so results show instantly and the explanation streams in after).
4. **Audit log** — every finding is written to a *simulated* Solana Agent
   Registry audit log (agent identity + validation record) shown on the page.

## Stack

- Next.js 16 (App Router), React 19, Node.js 24
- `@google/genai` — Gemma 4 (`gemma-4-31b-it`) through the Gemini API
- Scan + Gemma call in an API route: `app/api/scan/route.js`

## Run

```bash
npm install
cp .env.example .env   # then put your Gemini API key in .env
npm run dev            # http://localhost:3000
```

## Gemma 4 integration

_To be documented: exact model, prompt, and where it is called in `app/api/scan/route.js`._

## How GitHub Copilot helped

_To be documented with screenshots/logs._

## License

[MIT](LICENSE)
