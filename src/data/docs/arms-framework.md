# The ARMS framework (summary)

**A**pplications · **R**outines · **M**emory · **S**kills — giving your agent employee its own arms. Three maturity levels each, built bottom-up.

## Skills
1. **L1** — Pre-built skills via the desktop app; create more with a skill-creator skill.
2. **L2** — Skills as *folders*: a thin router SKILL.md plus reference files (brand, tone, palettes).
3. **L3** — Headless triggering: run the skill outside chat (`claude -p "<prompt>"`) from the dashboard skills deck, with model and effort chosen per run; the skill writes its artifact back.

## Memory
1. **L1** — One workspace folder (beware the 60,000-file sprawl).
2. **L2** — Router files: `CLAUDE.md` routes to department routers (`content.md`, `community.md`, …) which list relevant skills and references. Agents parse files at lightning speed — give them routers, not tidiness.
3. **L3** — A visual second-brain graph over the workspace for human navigation (see the Memory Graph panel).

## Routines
1. **L1** — Desktop-app routines: a routine is just a prompt the agent sends to itself on a schedule. Only runs while the computer is on.
2. **L2** — Always-on cloud agents (own machine in the cloud), synced with the local workspace via Syncthing.
3. **L3** — Everything on one VPS: files, context, and routines on a single 24/7 platform.

## Applications
1. **L1** — Desktop-app connectors.
2. **L2** — A search-connectors skill: find official connectors or community CLIs/APIs/MCPs, vet, install.
3. **L3** — Build your own connectors and micro-apps; surface them in the dashboard (Links, Generations, Memory Graph).
