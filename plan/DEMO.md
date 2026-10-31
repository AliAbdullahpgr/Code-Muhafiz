# Demo Script (≈3 min)

**Before demo:** `npm run dev`, open `http://localhost:3000`.

1. **Hook (20s)** — "One poisoned sub-dependency stole credentials from millions (event-stream, chalk/debug 2025).
   Maintainers can't read it all. Code-Muhafiz does."
3. **Upload scan (60s)** — *Upload folder* → `test/fixtures/trap-app`.
   Show risk score **critical**, findings: `event-stream@3.3.6` malicious (Snowflake intel),
   `crossenv` typosquat, `lodash@4.17.15` CVEs (OSV), postinstall `curl | sh` in a nested dep,
   `eval(Buffer.from(...))`, env exfiltration.
4. **Gemma (40s)** — Read the AI summary. Click **Explain** on the env-exfiltration finding → plain-language explanation for juniors.
5. **Fingerprint (20s)** — Show the SHA-256 on the report header; copy it.
6. **GitHub connector (20s)** — paste a real public repo URL, scan live.
7. **Close (10s)** — Tests: `npm test`. MIT licensed.

Fallback: if Gemma is down the summary comes from Claude Sonnet 5.5, then a template — say which badge you see.
