# Code-Muhafiz — Plan

> Autonomous AI security agent that scans GitHub repositories, analyzes dependencies,
> detects vulnerable or malicious packages, explains risks with **Google Gemma 4**,
> and fingerprints every report with a SHA-256 hash.

Built for **Hacktoberfest 2026 (AWS Student Builder Group × MLH, Multan)** —
*Challenge 2: Open-Source "Dependency Trap" Code Guard*.

## Problem

Supply-chain attackers hide backdoors deep inside recursive sub-dependencies
(event-stream → flatmap-stream, ua-parser-js, the 2025 chalk/debug hijack, Shai-Hulud worm).
Independent maintainers don't have the budget or hours to read millions of lines
of transitive code, so their users get hit with credential theft.

## Solution (one sentence)

Point Code-Muhafiz at a repo (URL or folder upload); in seconds it lists risky
dependencies and code, explains each one like a senior dev would to a junior,
and fingerprints the report so changes can be detected.

## Docs index

| Doc | What's inside |
|-----|---------------|
| [STACK.md](STACK.md) | Tech stack and why each piece was chosen |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Components, pipeline, sequence diagrams |
| [MVP_SCOPE.md](MVP_SCOPE.md) | In / out of scope, build checklist, timeline |
| [API.md](API.md) | REST endpoints with request/response examples |
| [DATA_MODEL.md](DATA_MODEL.md) | Dependency, Finding, Report, Snowflake schema |
| [DETECTION_RULES.md](DETECTION_RULES.md) | Every detector and rule, severities |
| [TRACKS.md](TRACKS.md) | How we satisfy each sponsor track + mandatory deliverables |
| [DEMO.md](DEMO.md) | 3-minute demo script for judges |

Agent/contributor rules live in [`../AGENT.md`](../AGENT.md).
