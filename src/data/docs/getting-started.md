# Getting started with Rubric++

This knowledge base is read by **both** humans and agents. Keep entries short, factual, and link-heavy — agents parse these files at lightning speed, so prefer router-style lists over prose.

## First run

1. `python server.py` from the `rubric-plus/` directory.
2. Open `http://localhost:8080`.
3. The dashboard reads everything from `data/`. Edit any file there; the dashboard live-updates over SSE.

## Your first agent write

Ask your agent: *"Append a new generation entry to data/generations.json for a test image, following the schema in docs/panel-contracts.md."* Watch the Generations panel update without a refresh.

## Where things live

- Panel data: `data/*.json`, `data/sprints.md`
- Docs (this KB): `data/docs/*.md`
- Event log: `data/events.jsonl` (append-only)
- Agent roster: `data/agents.json`
