# Phase 2 — One Living Vital (Hunger): Requirements

## Scope

Phase 2 makes the pet **alive**: a single vital (Hunger) decays over real time, and the player can press **Feed** to restore it. This phase establishes the canonical game-logic pattern — pure reducer, real-time tick, Context-powered store — that every later phase will extend.

### In Scope

| Area                   | What ships                                                                                                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Game types & state** | `src/game/state.ts` defines `Stat = number` and the Phase 2 subset of `PetModel`: `{ hunger: Stat }`. Exports `initialState`.                                                                                                                                                                           |
| **Constants**          | `src/game/constants.ts` exports `MAX_STAT = 100`, `MIN_STAT = 0`, `TICK_INTERVAL_MS = 3000`, `DECAY_PER_TICK = 1`, `FEED_AMOUNT = 20`.                                                                                                                                                                  |
| **Actions**            | `src/game/actions.ts` (or co-located in state.ts) exports `Action` union limited to `{ type: 'FEED' } \| { type: 'TICK'; elapsedMs: number }`. Other action names (`PLAY`, `REST`, `HEAL`, `RESET`) are **not** introduced in Phase 2.                                                                  |
| **Reducer**            | `src/game/reducer.ts` exports `reducer(state, action): State`. Pure function. Handles `FEED` (adds `FEED_AMOUNT`, clamps at `MAX_STAT`) and `TICK` (subtracts `DECAY_PER_TICK * (elapsedMs / TICK_INTERVAL_MS)`, floored to integer, clamps at `MIN_STAT`). All math clamps to `[0, 100]`.              |
| **Clamp helper**       | A small `clamp(value, min, max)` helper (in `reducer.ts` or a tiny `src/game/util.ts`) used by the reducer.                                                                                                                                                                                             |
| **Tick hook**          | `src/hooks/useTick.ts` takes a `dispatch` and a configurable `intervalMs`; uses `useEffect` + `setInterval` to dispatch `{ type: 'TICK', elapsedMs: intervalMs }` every interval. Cleans up on unmount.                                                                                                 |
| **Provider**           | `src/hooks/useTamagotchi.tsx` — exports `TamagotchiProvider` (client component) that owns `useReducer` + `useTick`, and `useTamagotchi()` that returns `{ state, dispatch }` from Context. Throws a clear error if used outside the provider.                                                           |
| **UI: StatBar**        | `src/components/StatBar.tsx` props: `{ label: string; value: number; max?: number }`. Presentational. Renders the label, a numeric readout `value / max` (e.g., `42 / 100`), and a horizontal bar. ARIA: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label={label}`. |
| **UI: FeedButton**     | `src/components/FeedButton.tsx`. Reads state via `useTamagotchi`, dispatches `FEED` on click. Disabled (`aria-disabled` + visual) when `hunger === MAX_STAT`.                                                                                                                                           |
| **Page wiring**        | `src/app/page.tsx` wraps content in `<TamagotchiProvider>` and renders `<PetStage>` with `<Pet />`, below that a `<StatBar label="Hunger" value={state.hunger} />`, below that `<FeedButton />`.                                                                                                        |
| **Tests — reducer**    | `tests/game/reducer.test.ts`: feeding clamps at 100; feeding from 0 adds `FEED_AMOUNT`; tick decays by expected amount; tick clamps at 0; tick with `elapsedMs = 0` is a no-op; tick is deterministic given `elapsedMs`. Uses no fake timers (pure function tests).                                     |
| **Tests — useTick**    | `tests/hooks/useTick.test.tsx`: with `vi.useFakeTimers()`, mount a harness that uses `useTick(dispatchSpy, 1000)`; advance time 3s; assert `dispatchSpy` called 3 times with `{ type: 'TICK', elapsedMs: 1000 }`.                                                                                       |
| **Tests — components** | `tests/components/StatBar.test.tsx` asserts role/aria values. `tests/components/FeedButton.test.tsx` (inside a provider) asserts clicking dispatches FEED and that the button becomes disabled at 100.                                                                                                  |

### Out of Scope (explicitly deferred)

- Happiness, Energy (→ Phase 3).
- PLAY, REST, HEAL actions (→ Phase 3 / 4).
- `isResting` flag, resting mechanic (→ Phase 3).
- Sick / Evolved states, state machine, sprite swaps (→ Phase 4).
- localStorage persistence, name, offline catch-up (→ Phase 5).
- Easter eggs, personality hash, idle reaction variants (→ Phase 6).
- Sound, accessibility announcements beyond baseline `role/aria-*` (→ Phase 7).
- Zustand or any external state library — `useReducer` + Context is explicitly the Phase 2 choice.
- `requestAnimationFrame`-driven tick — `setInterval` is the chosen strategy.

### Non-negotiables (Scope Contract from `mission.md`)

- Stats always clamped to `[0, 100]`. Never negative, never above max.
- No permadeath when hunger hits 0 (Phase 2 has no concept of death/Sick; hunger just sits at 0).
- No notifications, mini-games, social, currencies, admin UI.
- No auth or multiple-pet data shapes.

## Decisions

| Decision          | Choice                                                                                                                                                | Why                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| State library     | **`useReducer` + Context** via `TamagotchiProvider`                                                                                                   | Per `tech-stack.md` "Default to `useReducer` in Phase 2; upgrade only if prop drilling or perf becomes a pain." No Zustand yet. |
| Tick driver       | **`setInterval` inside `useEffect`**                                                                                                                  | Simple, predictable; rAF is overkill for 1 point per 3 s.                                                                       |
| Tick interval     | **`TICK_INTERVAL_MS = 3000`** (3 seconds)                                                                                                             | Fast enough to feel ambient during demos, slow enough that the player doesn't see a bar lurching.                               |
| Decay rate        | **`DECAY_PER_TICK = 1`**                                                                                                                              | 33 ticks (~100 s) from full to empty. Good demo pacing.                                                                         |
| Feed amount       | **`FEED_AMOUNT = 20`**                                                                                                                                | Five feeds refill from empty; player feels the care loop without spam.                                                          |
| Action shape      | **Discriminated union with `TICK` carrying `elapsedMs`**                                                                                              | Future-proof for Phase 5 offline catch-up (`TICK` with a large `elapsedMs` replays deterministic decay).                        |
| Math granularity  | **Integer stats only** (floor to integer inside reducer)                                                                                              | Matches scope contract (`Stat = integer 0-100`). Prevents fractional `aria-valuenow`.                                           |
| FeedButton UX     | **Disabled at `MAX_STAT`**                                                                                                                            | Clear signal, prevents no-op dispatches.                                                                                        |
| File layout       | **Game pure logic in `src/game/`, hooks in `src/hooks/`, UI in `src/components/`**                                                                    | Matches `tech-stack.md` layout; enforces "pure logic first, UI second."                                                         |
| Client directives | **`TamagotchiProvider` + `FeedButton` are client components** (`"use client"`). `Pet`, `PetStage`, `StatBar` remain server components where possible. | Tight blast radius for client-only code.                                                                                        |
| Testing harness   | **Vitest fake timers for `useTick`; pure function tests for reducer**                                                                                 | Deterministic, no wall-clock flake.                                                                                             |

## Context

### Tone & conventions

- **Naming**: types in `PascalCase` (`PetModel`, `Stat`, `Action`), constants in `SCREAMING_SNAKE_CASE`, functions/variables in `camelCase`, components `PascalCase`.
- **Imports**: absolute via `@/`; e.g., `import { reducer } from '@/game/reducer';`.
- **Purity**: everything in `src/game/` must be a pure function — no React imports, no timers, no `Date.now()` inside the reducer (`elapsedMs` is provided by the caller).
- **Copy**: the only new user-facing strings are the button label **"Feed"** and the stat label **"Hunger"**. Neutral, no filler.
- **Comments**: none required; where added, explain _why_ the rule exists (e.g., "clamped because stats are integer 0-100 by scope contract").

### Stack pointers (see `specs/tech-stack.md`)

- Next.js 16 App Router, React 19, TypeScript strict + `noUncheckedIndexedAccess`.
- Tailwind v4 for layout/spacing; no new CSS Module required unless the StatBar needs one.
- Vitest + React Testing Library + jsdom already configured in Phase 0.

### Existing patterns to follow

- **Pure game logic, impure UI** — `src/game/` touches no React or DOM APIs.
- **One source of truth** — `TamagotchiProvider` owns the state; components read via `useTamagotchi()`.
- **Scope Contract is law** — only introduce the types/actions listed above. Do **not** preemptively add `PLAY`/`REST`/`HEAL`.
- **Keep it tiny** — Phase 2 adds ~6 source files and ~4 test files. No new dependencies.

### Existing file layout (post Phase 1 merged)

- `src/components/` has `Pet.tsx`, `PetStage.tsx`.
- `src/styles/` has `pet.module.css`.
- `src/game/`, `src/hooks/` are still `.gitkeep`-only.
- `tests/components/` has `Pet.test.tsx`, `PetStage.test.tsx`.

### Open questions

- None. Decay rate and feed amount are calibration knobs that can be re-tuned in Phase 3 without breaking anything.
