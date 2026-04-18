# Phase 4 — Dynamic States & Heal: Requirements

## Scope

Phase 4 turns the care loop into a narrative. The pet now has exactly three lifecycle states — **Normal**, **Sick**, **Evolved** — with exactly four allowed transitions, a single recovery path (`HEAL`), and visibly distinct looks per state. No persistence, no naming, no easter eggs: Phase 4 is purely about _state-earned_ change.

### In Scope

| Area                       | What ships                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **State type**             | New type `PetState = 'Normal' \| 'Sick' \| 'Evolved'`. `PetModel` gains `state: PetState` and `hasEvolved: boolean`. `initialState.state = 'Normal'`, `hasEvolved = false`.                                                                                                                                                                                                                                                                                                                  |
| **Action union**           | Grows to `{ type: 'FEED' } \| { type: 'PLAY' } \| { type: 'REST' } \| { type: 'HEAL' } \| { type: 'TICK'; elapsedMs: number }`. Still **no** `RESET` (deferred to Phase 5).                                                                                                                                                                                                                                                                                                                  |
| **State machine module**   | New file `src/game/states.ts` exports pure `nextState(prev: PetState, neglectTicks: NeglectCounters, careTicks: number, hasEvolved: boolean): { state: PetState; hasEvolved: boolean }`. Called from the reducer inside the `TICK` branch. The state machine is the **only** place state transitions are computed; the reducer never writes `state` directly.                                                                                                                                |
| **Sick threshold**         | `SICK_VITAL_THRESHOLD = 10`. When any vital is `<= 10` while awake, a `neglectTicks[vital]` counter increments each TICK; when the vital recovers above 10, the counter resets to 0. When any counter reaches `SICK_NEGLECT_TICKS = 10` (30s at `TICK_INTERVAL_MS = 3000`), state transitions to `Sick` on the same returned state the TICK produced.                                                                                                                                         |
| **Evolved threshold**      | `EVOLVE_VITAL_THRESHOLD = 70`. When the pet is `Normal`, not `Sick`, not already `hasEvolved`, and all three vitals are `>= 70` while awake, a single `careTicks` counter increments each TICK; if any vital drops below 70 the counter resets to 0. When `careTicks` reaches `EVOLVE_CARE_TICKS = 60` (3min), state transitions to `Evolved` and `hasEvolved` is set to `true` on the same returned state.                                                                                   |
| **Allowed transitions**    | Exactly four: <br>`Normal → Sick` (neglect rule above). <br>`Evolved → Sick` (same neglect rule). <br>`Sick → prevHealthyState` (via `HEAL` only; see below). <br>`Normal → Evolved` (care rule above). <br>Every other state change is forbidden. In particular, `Evolved → Normal` never happens, and `hasEvolved` once true never becomes false.                                                                                                                                          |
| **Sick rule details**      | While `state === 'Sick'`: `FEED`, `PLAY`, `REST`, and `TICK` still run their vital deltas as in Phase 3, but the state machine never leaves `Sick` except via `HEAL`. `neglectTicks` stops accumulating (no double-Sick). `careTicks` stays at 0 while sick.                                                                                                                                                                                                                                 |
| **HEAL action**            | Reducer branch: if `state !== 'Sick'`, `HEAL` is a no-op (returns input state object identity). If `state === 'Sick'`, it (a) clamps all three vitals to `HEAL_SAFE_BAND = 50` if they were below 50, leaving higher values unchanged, and (b) resets the pet's `state` to `hasEvolved ? 'Evolved' : 'Normal'` — the **pre-sick state is recovered from `hasEvolved`, not from a stored pointer**, because `hasEvolved` is a one-way flag. Resets all `neglectTicks` to 0 and `careTicks` to 0. |
| **isResting interaction**  | TICK while `isResting` keeps freezing Hunger/Happiness (Phase 3 behavior). Neglect counters do **not** tick up during rest (the pet is not awake to be neglected). `careTicks` also does not advance during rest (rest is not active care). Both counters simply pause; they do not reset.                                                                                                                                                                                                   |
| **UI: Pet visual swap**    | `<Pet />` reads state from `useTamagotchi()` and sets `data-state={state}` on the root `<svg>`. `src/styles/pet.module.css` maps each state to CSS variables (`--pet-fill`, `--pet-eye`, `--pet-mouth`): Normal = existing palette, Sick = muted/greenish palette, Evolved = warmer/gold palette. Respects `prefers-reduced-motion` unchanged.                                                                                                                                                |
| **UI: Evolved crown**      | When `state === 'Evolved'`, `<Pet />` renders a small decorative crown overlay element as a sibling `<svg>` path inside the same root `<svg>`, with `aria-hidden="true"` (the aria-label already conveys state via the live region below). Crown is absent for Normal and Sick.                                                                                                                                                                                                              |
| **UI: Sick indicator**     | When `state === 'Sick'`, the pet stage renders a tiny animated `•••` marker (a new element, `data-testid="sick-indicator"`, `aria-hidden="true"`) above the pet. Removed when not Sick.                                                                                                                                                                                                                                                                                                      |
| **UI: aria-label updates** | `<Pet />`'s `aria-label` becomes `"Tiny tamagotchi, {mood}"` where `mood = { Normal: 'idling', Sick: 'sick', Evolved: 'thriving' }`. Phase 1 tests that regex-matched `/tiny tamagotchi, idling/i` continue to hold because Normal keeps `idling`.                                                                                                                                                                                                                                            |
| **UI: HealButton**         | New `src/components/HealButton.tsx`. Renders **only** when `state === 'Sick'`; otherwise returns `null` (never renders a disabled button). Uses the Phase 3 `<ActionButton />` primitive with label `"Heal"`. Always enabled when rendered.                                                                                                                                                                                                                                                  |
| **UI: aria-live region**   | Page includes a single `<div role="status" aria-live="polite" data-testid="state-announcer">` whose text content is `"Pet is now {state}"` on every state change. This is the a11y bridge: screen readers hear transitions even though the sprite just re-colors.                                                                                                                                                                                                                            |
| **Page wiring**            | `src/app/page.tsx` renders, inside `<TamagotchiProvider>`: title, stage, three StatBars (unchanged), then a button row. Row contents: Feed, Play, Rest always rendered; `<HealButton />` conditionally rendered (appears as the last item in the row when Sick). State announcer `div` rendered beneath the button row.                                                                                                                                                                     |
| **Tests**                  | See `plan.md §5` for the full list. Highlights: every allowed transition covered; every forbidden transition asserted _not_ to happen in the relevant reducer branch; HEAL is a no-op outside Sick; Evolved→Sick→Heal lands on Evolved; rest pauses (does not reset) both counters; Pet has correct `data-state` attribute per state; HealButton is absent in non-Sick DOM.                                                                                                                   |

### Out of Scope (explicitly deferred)

- `RESET` action (Phase 5).
- `localStorage` persistence of any field including `hasEvolved` (Phase 5).
- Pet naming and the first-load naming flow (Phase 5).
- Offline catch-up / `lastTickAt` (Phase 5).
- Easter egg animations, idle variants, personality hash (Phase 6).
- Sound effects, mute toggle, responsive layout tweaks, focus-visible pass (Phase 7).
- PNG sprite swap — Phase 4 uses CSS-variable recoloring on the existing inline SVG, per `Decisions`.
- Any new state beyond `Normal | Sick | Evolved`.

### Non-negotiables (Scope Contract from `mission.md`)

- States are `Normal | Sick | Evolved`. **No fourth state** under any name.
- Exactly four allowed transitions (enumerated above). No chained or reversible evolutions.
- No permadeath. Sick is terminal-feeling but recoverable via HEAL.
- HEAL is valid **only** while Sick; a no-op otherwise.
- All vitals remain integer-clamped to `[0, 100]`.
- No notifications APIs, social, mini-games, currency, admin UI.
- No new routes beyond `/`.

## Decisions

| Decision             | Choice                                                                   | Why                                                                                                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sick threshold       | **≤10 for 30s (10 ticks)**                                               | Short enough that a player can trigger Sick inside a demo without a watchdog timer, strict enough that brief dips don't nuke the pet. Uses TICK_INTERVAL_MS = 3000, so 10 ticks = 30 s.                                                                                   |
| Evolved threshold    | **all ≥70 for 3 min (60 ticks)**                                         | Rewards a full care-loop rotation (Feed → Play → Rest → Wake) sustained. 60 ticks at 3 s is long enough to feel earned, short enough to witness.                                                                                                                          |
| Visual diff strategy | **CSS-variable swap via `data-state` on the SVG + Evolved crown overlay** | Keeps one `<Pet />` component. Diff is tiny: one attribute, one overlay, three palettes. Tests stay asserting the attribute, not pixel snapshots. Keeps `prefers-reduced-motion` behavior unchanged. Avoids maintaining three SVG path sets or introducing PNG assets.    |
| State machine home   | **`src/game/states.ts`, called from inside `reducer` TICK / HEAL**        | Keeps the Phase 2/3 "one reducer" invariant. `states.ts` exports a pure `nextState()` — not a separate dispatcher — so there's still exactly one source of truth for state.                                                                                              |
| Recovery target      | **`hasEvolved ? 'Evolved' : 'Normal'`**                                   | `hasEvolved` is already the permanent record of whether evolution happened. Using it as the recovery pointer avoids a separate `prevHealthyState` field and makes "Evolved stays Evolved after Heal" structural, not rule-based.                                          |
| HEAL stat effect     | **Clamp each vital up to `HEAL_SAFE_BAND = 50`; leave higher untouched**  | Heal is a safety net, not a buff. It rescues from neglect without trivializing Feed/Play/Rest. Clamp _up_ only so a pet that got Sick from low Hunger but still has Happiness 80 keeps the 80.                                                                           |
| Counter bookkeeping  | **`neglectTicks` per vital (3 counters), `careTicks` scalar, on `PetModel`** | Per-vital neglect counters let "Hunger near 0 for 30s" trigger Sick even if Happiness briefly spiked. Scalar care counter matches the "_all_ ≥70" rule. All counters live on `PetModel` (state flows through one store, per tech-stack principle #3).                 |
| Rest during neglect  | **Pause (not reset) counters**                                           | Rest is neither neglect nor active care. Pausing preserves the narrative: if a pet was 9 ticks into Sick, resting for 20s doesn't rescue it but also doesn't punish a quick nap.                                                                                          |
| A11y for state       | **Polite aria-live region with `"Pet is now {state}"` text**              | Screen readers need an auditory signal of a visual-only change. `role="status"` + `aria-live="polite"` is the standard, non-interrupting pattern.                                                                                                                         |
| HealButton lifecycle | **Conditionally rendered (null when not Sick)**                          | A permanently-present-but-disabled Heal button would advertise a mechanic the player can't use most of the time and litter the Tab order. Null-render keeps the interface honest.                                                                                         |

## Context

### Tone & conventions

- **New user-facing strings**: button label `"Heal"`; aria-live text `"Pet is now Normal"`, `"Pet is now Sick"`, `"Pet is now Evolved"` (title case on the state name, sentence case on the lead). No toast, no modal, no emoji.
- **No new disabled-reason strings**: the existing Phase 3 reasons still apply (`"Pet is full"`, `"Pet is resting"`, `"Too tired to play"`). Feed/Play are **not** disabled by `Sick` — a sick pet can still eat — and `HealButton` has no disabled state because it isn't rendered when unavailable.
- **Comments**: scope-contract anchors only (clamp comment from Phase 2, atomic auto-wake comment from Phase 3, and a new "state machine is the only writer of `state`" anchor in the reducer).

### Stack pointers (see `specs/tech-stack.md`)

- Next.js 16, React 19, TypeScript strict + `noUncheckedIndexedAccess`.
- Tailwind v4 for layout, CSS Modules (`pet.module.css`) for palette variables and crown keyframe if any.
- Vitest + RTL + jsdom; `@testing-library/user-event` already on the devDeps list from Phase 0.
- No new npm dependencies. No new routes. No `localStorage` in Phase 4.

### Existing patterns to follow

- **Pure game logic, impure UI** — `states.ts` is pure, consumed by the reducer.
- **One source of truth** — `TamagotchiProvider` remains the owner. All UI reads via `useTamagotchi()`.
- **Atomic transitions** — state transitions happen on the same returned state as the TICK/HEAL that triggered them (no two-step dispatches).
- **Referential stability** — each reducer branch early-returns the input state when nothing changed.
- **Scope Contract is law** — no drift into forbidden actions or forbidden states.

### Existing file layout (post Phase 3 merged)

- `src/game/` has `state.ts`, `reducer.ts`, `constants.ts`, `util.ts`.
- `src/hooks/` has `useTick.ts`, `useTamagotchi.tsx`.
- `src/components/` has `Pet.tsx`, `PetStage.tsx`, `StatBar.tsx`, `ActionButton.tsx`, `FeedButton.tsx`, `PlayButton.tsx`, `RestButton.tsx`.
- `src/styles/pet.module.css` hosts the bob keyframe + pet-stage styles.
- `tests/` has `game/`, `hooks/`, `components/`, `integration/`, `browser/` subdirectories. Phase 4 adds `tests/game/states.test.ts` and extends most others.

### Open Questions

- None. Every decision above is concrete and every threshold is a named constant.
