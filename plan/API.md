# REST API

Base: `http://localhost:3000/api`. All bodies JSON.

## `GET /api/health`
```json
{ "ok": true, "ai": "gemma-4-31b-it", "aiEnabled": true, "snowflake": false, "anthropic": true, "anthropicModel": "claude-sonnet-5-5" }
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
→ `{ "explanation": "markdown...", "mode": "gemma" | "anthropic" | "fallback" }`

## `POST /api/summary`
```json
{ "scanId": "abc123" }
```
`/api/scan/*` returns findings first with `ai.mode = "pending"`; this call writes the AI summary → `{ "mode": "gemma" | "anthropic" | "fallback", "model": "…", "summary": "markdown…" }`.

## Errors
`{ "error": "message" }` with 400 (bad input), 404, 502 (upstream), 500.
