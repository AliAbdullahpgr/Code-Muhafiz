# Sponsor Tracks & Mandatory Deliverables

## Tracks

### Google Gemma 4 Core
- `src/ai/gemma.js` uses `@google/genai` with `GEMMA_MODEL=gemma-4-31b-it`.
- **Executive summary** per scan; **"Explain"** per finding — raw code line/advisory → plain language
  for junior devs: *what it is, why it's dangerous, how to fix, how to avoid next time*.
- Prompt includes evidence snippet, so Gemma summarizes the actual raw code lines.

### Snowflake CoCo Data
- `snowflake/01_schema.sql` — `COMPROMISED_PACKAGES`, `PUBLISH_EVENTS` tables.
- `snowflake/02_load_osv_malicious.sql` — pipeline that ingests the open-source OpenSSF
  malicious-packages / OSV dumps (freely accessible) into the table.
- `snowflake/03_anomaly_views.sql` — `V_PUBLISH_ANOMALIES`: new maintainer, install script added,
  version jump, publish burst — "suspicious library publishing anomalies".
- Pipelines authored with **CoCo (Snowflake Cortex Code)**; prompts in `snowflake/COCO_PROMPTS.md`.
- `src/intel/snowflake.js` queries the table live via the SQL API (PAT auth);
  `data/compromised_packages.json` is the exported snapshot used offline. **Code reference = deliverable #2.**

### Solana Agent Identity
- Agent keypair = identity. `POST /api/agent/register` → registration memo on devnet.
- Every scan → audit memo with report SHA-256 signed by the agent → **untamperable audit log**.
- `GET /api/proofs/:id/verify` and `GET /api/agent/history` → **pulling verifiable reputation records**.

### GitHub Copilot Acceleration
- `test/fixtures/trap-app/` — mock repo with subtle flaws, written by prompting Copilot.
- `test/*.test.js` — Copilot-generated suites asserting the engine finds every planted flaw.
- README section documents the exact prompts and where Copilot helped with lockfile/requirements parsing APIs.

## Mandatory deliverables

| Deliverable | Where |
|-------------|-------|
| Public GitHub codebase, clean code, visible open-source license block | `LICENSE` (MIT) + "License" section at bottom of README |
| Code referencing Snowflake datasets via CoCo | `src/intel/snowflake.js`, `snowflake/*.sql`, `snowflake/COCO_PROMPTS.md` |
| Live/simulated demo of agent pulling reputation records / registering signatures on Solana | UI "Agent" panel + proof panel; `plan/DEMO.md` |
| README: how Copilot helped with unfamiliar package parsing APIs | README → "How GitHub Copilot helped" |
