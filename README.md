# RUBRIC++ — Agentic OS (Beauty-Layer Redesign)

A cinematic, living command centre for a team of file-based agents. This is a **from-scratch redesign** of the RUBRIC++ dashboard's visual system — same product, same contractual data schemas, entirely new beauty layer.

**Live stack:** React 18 + TypeScript + Vite + Tailwind + hand-rolled WebGL2 shaders (no three.js).

## The design system

- **The Orb is the only agent.** Every agent is a self-lit sphere — violet/periwinkle energy behind dark glass, rendered by one reusable WebGL fragment shader. State = internal motion (idle drift → thinking vortex → acting streak → desaturated error), never icons or spinners.
- **Darkness has hue.** The void is deep navy-violet (`#07071A`), never black. Glass panels carry a 1px inner top highlight, 22px backdrop blur, radius 10/16/24 only.
- **Triadic color architecture.** Analogous violet field (hue 230–260°) with an ember orange-red counterpoint (hue ~10°, Δh≈120°) strictly rationed to action & attention. All text pairs WCAG AA/AAA verified.
- **Motion is ambient by default.** Nebula drift (~30s), orb breathing (2.8s sinusoidal), shimmer (4.8s) run continuously; UI chrome moves only on intent (≤480ms, tokenized easings, interruptible, reduced-motion aware).
- **Luminance is the hierarchy.** The brightest object in any view is the agent orb core (`#EAF9F3`) or the one primary CTA. Everything else stays under 70%.

## Panels

Board (zenith hero + instruments + swarm strip) · Agents · Flows (step constellation + 750ms event playback) · Skill Tree (ARMS L1→L3 ladder) · Crons (7-day star chart + live countdowns) · Generations · Docs · Sprints · Links · Memory Graph (constellation force graph with label de-collision and light-trail edges).

All panels render the real workspace data from `src/data/` (agents, flows, skills, crons, generations, links, memory, sprints, events, docs) — the schemas are contractual and unchanged from the zero-dependency original.

## Motion assets

`public/media/nebula-loop.mp4` and `public/media/orb-hero.mp4` are AI-generated ambient loops, blended under the shader layers (the app hides them cleanly if absent).

## Run

```bash
npm install
npm run dev      # dev server
npm run build    # production build → dist/
```

## Provenance

Design law derived from a measured teardown of the AmazingUI *Agentic OS Sphere/Orb* series, the *Mya* product shot, and Oron Creative's *Agentic AI Dashboard* motion reel (pixel-sampled color, frame-diffed motion timing), plus a full audit of the rejected first pass. Palette contrast math in `research/color_proof.py` (workspace archive).

*files are the database · agents welcome*
