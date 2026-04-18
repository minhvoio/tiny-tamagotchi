# Tiny Tamagotchi

A tiny digital companion that lives in your browser — feed it, play with it, rest it, and watch it grow.

## Overview

Tiny Tamagotchi is a spec-driven web app that recreates the emotional core of the 90s Tamagotchi:

- **Living Vitals** — Hunger, Happiness, and Energy tick down in real time (0–100).
- **Care Loop** — Feed, Play, Rest keep the pet healthy.
- **Dynamic States** — Normal, Sick, Evolved. One recovery path (Heal), one permanent evolution.
- **Personal Touches** — naming, idle animations, small easter-egg reactions.

No auth. No multiplayer. No permadeath. One pet per browser.

## Constitution

All design decisions live in [`specs/`](./specs/):

- [`specs/mission.md`](./specs/mission.md) — vision, scope contract, non-goals.
- [`specs/tech-stack.md`](./specs/tech-stack.md) — technical choices and canonical types.
- [`specs/roadmap.md`](./specs/roadmap.md) — phased implementation plan.

Each phase has its own dated spec folder under `specs/YYYY-MM-DD-<phase-name>/` with `requirements.md`, `plan.md`, and `validation.md`.

## Tech Stack

- **Next.js 14+** (App Router)
- **React 18+** with **TypeScript** (strict)
- **Tailwind CSS**
- **Vitest** + **React Testing Library**
- **pnpm** package manager
- **localStorage** for persistence (Phase 5)

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)

## Commands

> These scripts become available once Phase 0 bootstraps the Next.js app.

```bash
pnpm install       # install dependencies
pnpm dev           # start dev server at http://localhost:3000
pnpm test          # run the Vitest suite
pnpm build         # production build
pnpm lint          # ESLint
pnpm typecheck     # tsc --noEmit
pnpm format        # Prettier write
```

## Project Status

Currently in **Phase 0 — Project Skeleton**. See [`specs/roadmap.md`](./specs/roadmap.md) for the full phase plan:

| Phase | Goal |
|---|---|
| 0 | Project skeleton: Next.js + TS + Tailwind + Vitest |
| 1 | Static pet on screen with idle animation |
| 2 | Hunger vital: tick + feed + tests |
| 3 | Full care loop: 3 vitals + 3 actions |
| 4 | Dynamic states (Normal / Sick / Evolved) + Heal |
| 5 | Persistence, naming, offline aging |
| 6 | Personality & easter eggs |
| 7 | Polish, accessibility, deploy |

## Layout

```
tiny-tamagotchi/
├── specs/                      # Constitution and phase specs
├── public/sprites/             # Pet frames (Phase 1+)
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/             # Pet, StatBar, ActionButton
│   ├── game/                   # Pure reducer + tick + state machine
│   ├── hooks/                  # useTamagotchi, useTick, usePersistence
│   └── styles/                 # globals, sprite animations
└── tests/                      # Vitest specs
```

## License

MIT (or unset until decided).
