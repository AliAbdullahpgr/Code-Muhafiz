# Detection Rules

## 1. OSV (`src/detectors/osv.js`) — source `osv`
| Condition | Type | Severity |
|-----------|------|----------|
| vuln id starts with `MAL-` | malicious | critical |
| GHSA `database_specific.severity` CRITICAL/HIGH/MODERATE/LOW | vulnerability | critical/high/medium/low |
| CVSS score only | vulnerability | ≥9 critical, ≥7 high, ≥4 medium, else low |
| unknown | vulnerability | medium |

Fix = first `fixed` event in affected ranges.

## 2. Threat intel (`src/detectors/threatintel.js`) — source `snowflake` | `snapshot`
Match `ecosystem + lower(name)` and (`version == '*'` or exact version). Type `malicious`, severity from row.

## 3. Typosquat (`src/detectors/typosquat.js`) — source `heuristic`
- Name is **not** in popular list, and
- Levenshtein distance to a popular name ≤ 1 (≤ 2 if name length ≥ 8), or
- equals popular name after removing `-`, `_`, `.`, `js` / `py` prefixes/suffixes.
Severity **high**.

## 4. Install scripts (`src/detectors/patterns.js`) — any `package.json`
| Rule | Severity |
|------|----------|
| `preinstall`/`install`/`postinstall` present in a **dependency** (`node_modules/…`) | medium |
| …and script contains `curl`, `wget`, `| sh`, `powershell`, `base64`, `eval`, `node -e`, `http(s)://` | high |
| …in the root project | low / high with same escalation |

## 5. Suspicious code (`src/detectors/patterns.js`) — `.js .mjs .cjs .ts .py .sh`
| Rule id | Pattern | Severity |
|---------|---------|----------|
| `obfuscated-eval` | `eval(`/`new Function(` with `Buffer.from`, `atob`, `base64`, `fromCharCode`, `\x..` | high |
| `env-exfiltration` | `process.env` / `os.environ` **and** network call (`fetch`, `http.request`, `axios`, `requests.post`, `https.get`) in same file | high |
| `credential-file-read` | `.npmrc`, `.ssh/`, `id_rsa`, `.aws/credentials`, `.git-credentials`, `wallet.dat` | high |
| `remote-shell` | `curl … \| sh/bash`, `wget … \| sh`, `Invoke-WebRequest … iex` | high |
| `exfil-webhook` | `discord(app)?.com/api/webhooks`, `api.telegram.org/bot`, `pastebin.com`, `ngrok.io` | high |
| `child-process-network` | `child_process` + network call | medium |
| `long-encoded-blob` | base64/hex literal ≥ 400 chars | medium |
| `python-exec-decode` | `exec(` + `base64.b64decode`/`marshal.loads`/`zlib.decompress` | high |

## Scoring (`src/detectors/scoring.js`)
`score = min(100, 40·critical + 20·high + 7·medium + 2·low)`.
Level: 0 → safe, <15 low, <40 medium, <70 high, else critical.
