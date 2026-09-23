# Panel contracts — the schemas agents MUST follow

Every panel reads one file. Agents writing to these files must match the shapes below exactly. Run `python validate.py` after any write.

## agents.json
`{ version, agents: [{ id, name, role, model, status(active|idle|running|offline), lastTask, lastActive(ISO) }] }`

## flows.json
`{ version, flows: [{ id, name, trigger, steps: [{ id, label, agent }], runs: [{ id, started, events: [{ step, status(done|running|waiting|failed), ts, note? }] }] }] }`
Rule: **append** step events; never rewrite past events. A retried step is a new event with the same `step` id.

## crons.json
`{ version, crons: [{ id, name, schedule(cron expr), human, host, agent, skill, enabled, lastRun(ISO), lastStatus, artifact }] }`
Rule: after every firing, update `lastRun`, `lastStatus`, `artifact` in place.

## generations.json
`{ version, generations: [{ id, type(image|video), prompt, model, skill, seed, ts, asset }] }`
Rule: **append after every image/video generation**, newest last. Never edit old entries.

## skills.json
`{ version, skills: [{ id, name, level(1|2|3), description, path, refs: [...], triggers: [...] }] }`

## links.json
`{ version, links: [{ label, url, category, note }] }`

## memory.json
`{ version, nodes: [{ id, type(router|skill|doc|data), label }], edges: [[fromId, toId]] }`
Rule: when you create a new router/skill/doc, add its node and edges here.

## sprints.md
Markdown with exactly three `##` headings: `In Progress`, `Backlog`, `Done`. Tasks are `- [ ]` / `- [x]` lines. Move lines between sections; never delete.

## events.jsonl
One JSON object per line: `{ "ts", "actor", "panel", "action", "payload" }`. Append-only. This is the audit trail — log every write you make to any file above.
