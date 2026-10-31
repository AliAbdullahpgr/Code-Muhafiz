# Demo Script (≈3 min)

**Before demo:** `npm run keygen` (fund via https://faucet.solana.com if airdrop is rate-limited),
`npm start`, open `http://localhost:3000`, click **Register agent** once.

1. **Hook (20s)** — "One poisoned sub-dependency stole credentials from millions (event-stream, chalk/debug 2025).
   Maintainers can't read it all. Code-Muhafiz does."
2. **Agent identity (20s)** — Show Agent panel: public key, devnet balance, registration tx → open Explorer.
3. **Upload scan (60s)** — *Upload folder* → `test/fixtures/trap-app`.
   Show risk score **critical**, findings: `event-stream@3.3.6` malicious (Snowflake intel),
   `crossenv` typosquat, `lodash@4.17.15` CVEs (OSV), postinstall `curl | sh` in a nested dep,
   `eval(Buffer.from(...))`, env exfiltration.
4. **Gemma (40s)** — Read the AI summary. Click **Explain** on the env-exfiltration finding → plain-language explanation for juniors.
5. **Solana proof (30s)** — Proof panel: tx signature → Explorer shows the memo with the report hash.
   Click **Verify** → ✓ hash matches, ✓ signed by agent, ✓ on-chain.
6. **GitHub connector (20s)** — paste a real public repo URL, scan live.
7. **Close (10s)** — Agent history = public reputation log. Tests: `npm test`. MIT licensed.

Fallback: if Wi-Fi dies, everything runs in simulated mode — say so explicitly.
