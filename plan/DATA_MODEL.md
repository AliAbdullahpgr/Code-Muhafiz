# Data Model

## Dependency
```js
{
  name: 'lodash', version: '4.17.15', range: '^4.17.15',
  ecosystem: 'npm',            // 'npm' | 'PyPI'  (OSV ecosystem names)
  file: 'package-lock.json',
  direct: true, depth: 0,      // depth = node_modules nesting in lockfile
  dev: false
}
```

## Finding
```js
{
  id: 'f-1',
  type: 'vulnerability' | 'malicious' | 'typosquat' | 'install-script' | 'suspicious-code',
  severity: 'critical' | 'high' | 'medium' | 'low',
  title: 'Prototype Pollution in lodash',
  description: '...',
  package: 'lodash', version: '4.17.15', ecosystem: 'npm',
  file: 'package-lock.json', line: 12, evidence: 'snippet',
  source: 'osv' | 'snowflake' | 'snapshot' | 'heuristic',
  references: ['https://...'], fix: 'Upgrade to 4.17.21', ruleId: 'GHSA-...'
}
```

## Report
```js
{
  scanId, createdAt, agent: '<pubkey>',
  source: 'github' | 'upload' | 'local',
  target: 'owner/repo@branch' | 'upload:name',
  stats: { files, manifests, dependencies, direct, transitive, ecosystems: {npm: n} },
  dependencies: Dependency[],
  findings: Finding[],
  summary: { score: 0-100, level, counts: { critical, high, medium, low } },
  ai: { mode: 'gemma' | 'fallback', model, summary: 'markdown' },
  warnings: [],
  reportHash: 'sha256 hex',
  proof: Proof | null
}
```

`reportHash` = SHA-256 of canonical (sorted-keys) JSON of
`{ scanId, createdAt, target, agent, summary, findings: [{type, severity, package, version, ruleId, file, line}] }`.
AI text is excluded (non-deterministic).

## Proof
```js
{ mode: 'devnet' | 'simulated', signature, reportHash, agent, memo, slot?, explorerUrl?, timestamp, prevHash? }
```

## Snowflake: `CODE_MUHAFIZ.INTEL.COMPROMISED_PACKAGES`
| Column | Type | Notes |
|--------|------|-------|
| ECOSYSTEM | VARCHAR | `npm`, `PyPI` |
| PACKAGE_NAME | VARCHAR | lower-case |
| VERSION | VARCHAR | exact version or `*` |
| SEVERITY | VARCHAR | critical/high/... |
| CATEGORY | VARCHAR | `malicious`, `hijacked`, `protestware`, `typosquat` |
| REASON | VARCHAR | short description |
| SOURCE | VARCHAR | `osv-mal`, `ghsa`, `manual` |
| REFERENCE_URL | VARCHAR | |
| PUBLISHED_AT | TIMESTAMP_NTZ | |

Plus `PUBLISH_EVENTS` and `V_PUBLISH_ANOMALIES` (see `snowflake/`). Local snapshot:
`data/compromised_packages.json` has identical lower-cased keys.
