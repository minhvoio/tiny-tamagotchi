# Tech Stack

## Summary

**Next.js (App Router) + React + TypeScript**, client-rendered for the pet experience, with persistence handled in the browser.

## Primary Stack

| Layer                | Choice                                                                  | Rationale                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Framework            | **Next.js 14+ (App Router)**                                            | Modern React framework, file-based routing, built-in bundling, easy Vercel deploy. Overkill-resistant: we only use what we need.    |
| Language             | **TypeScript (strict)**                                                 | Type-safe state machine for pet vitals/states; catches care-loop bugs early.                                                        |
| UI Library           | **React 18+**                                                           | Component model fits pet + stat meters + action buttons cleanly.                                                                    |
| Styling              | **Tailwind CSS** + CSS Modules for sprite/animation-specific styles     | Utility-first for speed; CSS Modules where we need keyframes and pixel-precise control.                                             |
| State                | **Zustand** (or React Context + reducer if we stay minimal)             | Lightweight global store for pet state; no Redux boilerplate. Decision revisited in Phase 2.                                        |
| Persistence          | **`localStorage`** (Phase 5)                                            | Pet survives page reloads. No backend needed. Wrapped behind a small storage adapter so we can swap to IndexedDB or a server later. |
| Animations           | **CSS keyframes + React state-driven class swaps**                      | Pixel-art friendly; avoids heavy animation libs. Framer Motion allowed only if a specific need arises.                              |
| Icons / Sprites      | **Inline SVG** or **CSS sprite sheets** from a `public/sprites/` folder | Crisp at any size, themable via CSS variables.                                                                                      |
| Audio (optional)     | **Web Audio API** via a thin wrapper                                    | Short beeps/boops for feedback; muted by default.                                                                                   |
| Testing              | **Vitest** + **React Testing Library**                                  | Fast unit tests for the vitals reducer and state machine.                                                                           |
| Linting / Formatting | **ESLint** (Next.js config) + **Prettier**                              | Consistent style, catches common React/TS issues.                                                                                   |
| Package Manager      | **pnpm**                                                                | Fast, disk-efficient, reliable lockfile.                                                                                            |
| Hosting              | **Vercel**                                                              | Zero-config for Next.js; free tier is plenty.                                                                                       |

## Project Layout (target)

```
tiny-tamagotchi/
├── specs/                      # Constitution (this folder)
├── public/
│   └── sprites/                # Pet frames, icons
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx
│   │   └── page.tsx            # The pet lives here
│   ├── components/             # Pet, StatBar, ActionButton, etc.
│   ├── game/                   # Pure logic — reducer, tick loop, state machine
│   │   ├── state.ts            # Types + initial state
│   │   ├── reducer.ts          # Actions → new state
│   │   ├── tick.ts             # Time-based decay
│   │   └── states.ts           # Normal / Sick / Evolved transitions
│   ├── hooks/                  # useTamagotchi, useTick, usePersistence
│   └── styles/                 # globals.css, sprite animations
├── tests/                      # Vitest specs
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## Architectural Principles

1. **Pure game logic, impure UI.** Everything in `src/game/` is a pure function of `(state, action) → state`. React is just the renderer.
2. **Real-time ticks.** A single `useTick` hook drives vital decay; UI reads from state. Time math accounts for wall-clock drift (pet ages even when tab was closed, within limits).
3. **One source of truth for the pet.** Stats, state, age, name — all live in one store. Components are read-only consumers.
4. **Persistence is a side-effect, not a coupling.** Storage adapter reads/writes the same state shape the game produces.
5. **Pixel-first aesthetic.** Sprites are crisp; `image-rendering: pixelated` everywhere, no blurry scaling.
6. **Scope Contract is law.** Types enforce the Mission's scope: stats are `Stat = number /* 0–100 */`, state is `PetState = 'Normal' | 'Sick' | 'Evolved'`, actions are `'FEED' | 'PLAY' | 'REST' | 'HEAL' | 'TICK' | 'RESET'`. No room to drift into forbidden features.

## Canonical Type Shape (locked by Mission)

```ts
type Stat = number; // always clamped to [0, 100]
type PetState = 'Normal' | 'Sick' | 'Evolved';
type Action =
  | { type: 'FEED' }
  | { type: 'PLAY' }
  | { type: 'REST' }
  | { type: 'HEAL' } // valid ONLY when state === 'Sick'
  | { type: 'TICK'; elapsedMs: number }
  | { type: 'RESET' };

interface PetModel {
  name: string;
  vitals: { hunger: Stat; happiness: Stat; energy: Stat };
  state: PetState;
  isResting: boolean;
  hasEvolved: boolean; // once true, never false again
  lastTickAt: number; // epoch ms, for offline catch-up
}
```

## What We Explicitly Avoid

- No backend / no database (until a specific feature demands it).
- No authentication, no user accounts, no multi-user data model.
- No server actions for pet state (client-only until proven needed).
- No heavy animation or game engine (Phaser, PixiJS, etc.).
- No CSS-in-JS runtime libraries with big runtime cost.
- No notifications APIs (Web Push, Notifications API) — banned by scope.
- No inventory/currency/shop data structures.
- No admin or debug routes in production bundles.

## Open Decisions (revisit per phase)

- **State library:** Zustand vs. `useReducer` + Context. Default to `useReducer` in Phase 2; upgrade only if prop drilling or perf becomes a pain.
- **Audio:** Opt-in feature, deferred to post-MVP.
- **Offline ticking beyond a session:** Implemented via `lastTickAt` timestamp in Phase 5; no service worker required.
