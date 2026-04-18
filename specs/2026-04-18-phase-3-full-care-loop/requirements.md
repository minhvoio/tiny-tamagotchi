# Phase 3 — Full Care Loop: Requirements

## Scope

Phase 3 completes the minute-to-minute gameplay. All three vitals (Hunger, Happiness, Energy) decay on TICK, and the player has all three actions (Feed, Play, Rest) with interdependent effects. Rest locks the pet until Energy refills. No Sick/Evolved states yet — Phase 3 is purely about the care loop being fun to rotate through.

### In Scope

| Area                   | What ships                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vitals shape**       | `Vitals = { hunger: Stat; happiness: Stat; energy: Stat }`. `PetModel` gains `isResting: boolean` (and keeps `vitals`). All stats are integers clamped to `[0, 100]`.                                                                                                                                                                                                                     |
| **Actions**            | Union grows to `{ type: 'FEED' } \| { type: 'PLAY' } \| { type: 'REST' } \| { type: 'TICK'; elapsedMs: number }`. **Not** introduced in Phase 3: `HEAL`, `RESET`.                                                                                                                                                                                                                         |
| **Care amounts table** | `src/game/constants.ts` gains a `CARE_AMOUNTS` object and `REST_RECOVERY_PER_TICK`: <br>• `FEED`: `hunger +20`, `happiness +5` <br>• `PLAY`: `happiness +20`, `energy -15` <br>• `REST`: toggles `isResting=true`; no direct stat delta <br>• TICK while resting: `energy +10`, other stats do **not** decay. <br>• TICK while awake: all three stats decay by `DECAY_PER_TICK` (1).      |
| **Reducer rules**      | `FEED`: if `isResting` → no-op. Else apply deltas, clamp. <br>`PLAY`: if `isResting` or `energy < PLAY_MIN_ENERGY` (10) → no-op. Else apply deltas, clamp. <br>`REST`: if `isResting` → toggles off (acts as "Wake"). Else sets `isResting=true`. <br>`TICK`: if `isResting`, add `REST_RECOVERY_PER_TICK` to energy; if energy reaches 100, set `isResting=false`. Else decay all three. |
| **Auto-wake**          | On the same TICK that brings energy to 100 while resting, the reducer sets `isResting=false`. No extra action needed.                                                                                                                                                                                                                                                                     |
| **UI: three StatBars** | Hunger, Happiness, Energy rendered top-to-bottom **in that exact order**. Reuse `<StatBar />` from Phase 2.                                                                                                                                                                                                                                                                               |
| **UI: action buttons** | Reusable `<ActionButton />` at `src/components/ActionButton.tsx` that takes `{ label, onPress, disabled, disabledReason? }` and renders a button with `aria-disabled` and a `title` showing the reason. `FeedButton` refactors to use it; new `PlayButton`, `RestButton` follow the same shape.                                                                                           |
| **Disabled semantics** | `Feed`: disabled when `hunger === 100` or `isResting` (reason: "Pet is full" / "Pet is resting"). <br>`Play`: disabled when `energy < 10` or `isResting` (reason: "Too tired to play" / "Pet is resting"). <br>`Rest`: label is "Rest" normally, "Wake" when `isResting`; never disabled.                                                                                                 |
| **Tests**              | Reducer: all branches covered including `isResting` gates, auto-wake at 100, REST toggle, cross-effects. Components: `StatBar` still passes; `ActionButton` disabled/enabled ARIA; each button correctly wired inside `TamagotchiProvider`. A small integration test uses `@testing-library/user-event` to simulate: feed → play → rest → wake and asserts final state shape.             |
| **Page layout**        | `src/app/page.tsx`: title, `<PetStage><Pet /></PetStage>`, three StatBars (Hunger/Happiness/Energy), a row of three action buttons (Feed/Play/Rest). Tailwind flex/grid; no CSS Modules beyond existing `pet.module.css`.                                                                                                                                                                 |

### Out of Scope (explicitly deferred)

- Sick / Evolved states (→ Phase 4).
- `HEAL` action and `<HealButton />` (→ Phase 4).
- Sprite swap or any state-driven Pet visual change (→ Phase 4).
- `RESET` action and reset button (→ Phase 5).
- localStorage persistence, naming, offline catch-up (→ Phase 5).
- Easter eggs, idle animation variants, personality (→ Phase 6).
- Sound, toasts, reduced-motion-aware action feedback (→ Phase 7).
- A `mood` derived field or state-machine module — deferred; Phase 3 keeps one reducer.

### Non-negotiables (Scope Contract from `mission.md`)

- All stats integer-clamped to `[0, 100]`.
- No permadeath. A stat at 0 sits at 0; nothing terminal happens.
- No notifications, mini-games, social, currencies, admin UI.
- No new routes beyond `/`.

## Decisions

| Decision          | Choice                                                                        | Why                                                                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| State machine     | **Keep one reducer; add `isResting` as a flag**                               | Phase 4 introduces the `states.ts` state machine for Normal/Sick/Evolved. Resting is a minor mode, not a full state. Avoids two state-machine designs colliding. |
| Care tuning       | **`CARE_AMOUNTS` table + `PLAY_MIN_ENERGY=10` + `REST_RECOVERY_PER_TICK=10`** | One place to tune balance. Values chosen so a cycle Feed → Play → Rest → Wake takes roughly 1 minute on `TICK_INTERVAL_MS=3000`.                                 |
| Cross-effects     | **Small happiness bump on FEED, energy cost on PLAY**                         | Makes the loop feel alive without making balancing a puzzle.                                                                                                     |
| REST toggling     | **Same button toggles Rest/Wake**                                             | Matches the Tamagotchi expectation: one button to lie down, one to get up; we reuse the same control by relabeling.                                              |
| Disabled-state UX | **`aria-disabled` + `title`**                                                 | Screen readers announce, sighted users see a tooltip. Zero new components, zero copy proliferation.                                                              |
| StatBar ordering  | **Hunger → Happiness → Energy (fixed)**                                       | Matches the Required column of the Scope Contract table visually; stable for muscle memory.                                                                      |
| Testing strategy  | **Extend reducer test file; new test for ActionButton; one integration test** | Keeps reducer coverage centralized. Integration test guards against regressions in the care loop without becoming fragile.                                       |
| External deps     | **None added**                                                                | `@testing-library/user-event` is already a dev dep from Phase 0.                                                                                                 |

## Context

### Tone & conventions

- **New user-facing strings**: `"Happiness"`, `"Energy"`, `"Play"`, `"Rest"`, `"Wake"`. Plus the disabled-reason strings in `title`: `"Pet is full"`, `"Pet is resting"`, `"Too tired to play"`. Neutral, no filler.
- **Naming**: `ActionButton` is generic; concrete wrappers are `FeedButton`, `PlayButton`, `RestButton`. Reducer branches read top-to-bottom in action order FEED → PLAY → REST → TICK.
- **Pure logic rule**: no `Date.now()` inside reducer. All time math stays driven by `elapsedMs` on TICK.
- **Comments**: only where they clarify scope-contract constraints (e.g., "// clamps because stats are integer 0-100 by scope contract").

### Stack pointers (see `specs/tech-stack.md`)

- Next.js 16, React 19, TypeScript strict + `noUncheckedIndexedAccess`.
- Tailwind v4 for layout; no CSS Modules added in Phase 3.
- Vitest + RTL + jsdom, plus `@testing-library/user-event`.

### Existing patterns to follow

- **Pure game logic, impure UI** — all new game rules live in `src/game/`.
- **One source of truth** — `TamagotchiProvider` remains the owner. Components read via `useTamagotchi()`.
- **Scope Contract is law** — do not add HEAL, RESET, or Sick/Evolved logic.
- **Keep it tiny** — no new config, no new deps, no new CSS Modules.

### Existing file layout (post Phase 2 merged)

- `src/game/` has `state.ts`, `reducer.ts`, `constants.ts`, `util.ts`.
- `src/hooks/` has `useTick.ts`, `useTamagotchi.tsx`.
- `src/components/` has `Pet.tsx`, `PetStage.tsx`, `StatBar.tsx`, `FeedButton.tsx`.
- `tests/game/` has `reducer.test.ts`. `tests/hooks/` has hook tests. `tests/components/` has component tests.

### Open questions

- None. Numeric tuning is tunable; the structural contract above is fixed.
