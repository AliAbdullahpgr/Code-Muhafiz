# REST API

Base: `http://localhost:3000/api`. All bodies JSON.

## `GET /api/health`
```json
{ "ok": true, "ai": "gemma-4-31b-it", "aiEnabled": true, "snowflake": false, "solana": { "mode": "devnet", "agent": "7xK..." } }
```

## `POST /api/scan/github`
```json
{ "repo": "https://github.com/owner/name", "branch": "main" }
```
`branch` optional (default branch is used). Returns a **Report** (see DATA_MODEL.md).

## `POST /api/scan/upload`
```json
{ "name": "my-project", "files": [ { "path": "package.json", "content": "{...}" } ] }
```
Limit 25 MB. The browser pre-filters files; the server filters again.

## `GET /api/reports` / `GET /api/reports/:scanId`
List recent reports (summary) / full report.

## `POST /api/explain`
```json
{ "scanId": "abc123", "findingId": "f-3" }
```
→ `{ "explanation": "markdown...", "mode": "gemma" | "fallback" }`

## `POST /api/proofs/:scanId`
Record (or re-record) a Solana proof for a report. Returns **Proof**.

## `GET /api/proofs/:scanId/verify`
```json
{ "valid": true, "mode": "devnet", "checks": { "hashMatches": true, "signerIsAgent": true, "onChain": true },
  "reportHash": "…", "onChainMemo": "{…}", "explorerUrl": "https://explorer.solana.com/tx/…?cluster=devnet" }
```

## `GET /api/agent`
Agent identity: public key, balance, registration signature, mode.

## `POST /api/agent/register`
Writes the agent registration memo on-chain (once). Returns identity.

## `GET /api/agent/history`
Recent on-chain records signed by the agent (`getSignaturesForAddress`), i.e. its public reputation log.

## Errors
`{ "error": "message" }` with 400 (bad input), 404, 502 (upstream), 500.
