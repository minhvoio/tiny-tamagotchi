# Phase 4 — Dynamic States & Heal: Plan

Extend Phase 3's reducer with a pure state-machine module, a `HEAL` action, per-state visuals, and an a11y announcer. Tests drive the state transitions.

---

## 1. Extend types, constants, and `initialState`

1.1. In `src/game/constants.ts` add: `SICK_VITAL_THRESHOLD = 10`, `SICK_NEGLECT_TICKS = 10`, `EVOLVE_VITAL_THRESHOLD = 70`, `EVOLVE_CARE_TICKS = 60`, `HEAL_SAFE_BAND = 50`.
1.2. In `src/game/state.ts`:

- Add `export type PetState = 'Normal' | 'Sick' | 'Evolved';`
- Add to `PetModel`: `state: PetState; hasEvolved: boolean; neglectTicks: { hunger: number; happiness: number; energy: number }; careTicks: number;`.
- Extend `Action` union with `{ type: 'HEAL' }`.
- Update `initialState`: `state: 'Normal', hasEvolved: false, neglectTicks: { hunger: 0, happiness: 0, energy: 0 }, careTicks: 0`.
  1.3. Run `pnpm typecheck`. The reducer and existing tests will fail until §2 and §6 land; that's expected.

## 2. Add `src/game/states.ts` (pure state machine)

2.1. Export `export function nextState(args: { prev: PetState; hasEvolved: boolean; neglectTicks: { hunger: number; happiness: number; energy: number }; careTicks: number }): { state: PetState; hasEvolved: boolean }`.
2.2. Rules inside `nextState`:

- If `prev === 'Sick'` → return `{ state: 'Sick', hasEvolved }`. (Sick is only exited by `HEAL`, not by the state machine.)
- If any of `neglectTicks.hunger`, `neglectTicks.happiness`, `neglectTicks.energy` is `>= SICK_NEGLECT_TICKS` → `{ state: 'Sick', hasEvolved }`.
- Else if `prev === 'Normal' && !hasEvolved && careTicks >= EVOLVE_CARE_TICKS` → `{ state: 'Evolved', hasEvolved: true }`.
- Else → `{ state: prev, hasEvolved }`.
  2.3. `states.ts` contains **no** timing logic, **no** vital inspection. Counters are supplied by the reducer.

## 3. Extend the reducer (`src/game/reducer.ts`)

3.1. Top of file: a single scope-contract comment anchoring "`state` and `hasEvolved` are written **only** from the value returned by `states.nextState()`." (one of the permitted scope-contract comments).
3.2. `FEED`, `PLAY` branches: keep Phase 3 behavior. Both still no-op while resting. No change to counters.
3.3. `REST` branch: keep Phase 3 behavior. No change to counters.
3.4. `HEAL` branch (new): if `state !== 'Sick'`, return input state object identity. Else compute `nextVitals` by clamping each vital up to `HEAL_SAFE_BAND` (`max(v, HEAL_SAFE_BAND)` then clamp to `[0, 100]`). Set `state` to `hasEvolved ? 'Evolved' : 'Normal'`. Reset `neglectTicks` all to 0 and `careTicks` to 0. Return a new state object with these fields updated.
3.5. `TICK` branch (rewrite):

- Compute number of ticks as before.
- If resting: keep Phase 3 energy-recovery logic, including atomic auto-wake. Counters are **untouched** (paused).
- If awake: apply decay to vitals as in Phase 3. Then derive new counters:
  - For each vital `v ∈ { hunger, happiness, energy }`: `neglectTicks[v] = nextVitals[v] <= SICK_VITAL_THRESHOLD ? neglectTicks[v] + ticks : 0`.
  - `careTicks` = `(nextVitals.hunger >= 70 && nextVitals.happiness >= 70 && nextVitals.energy >= 70 && prev.state === 'Normal' && !prev.hasEvolved) ? prev.careTicks + ticks : 0`.
- Call `nextState({ prev: prev.state, hasEvolved: prev.hasEvolved, neglectTicks: nextNeglect, careTicks: nextCare })` and merge its return into the returned object (so the `TICK` that crosses `SICK_NEGLECT_TICKS` produces a state where counters, vitals, `state`, and `hasEvolved` all reflect the new reality on the same returned object).

## 4. Update reducer tests (`tests/game/reducer.test.ts`)

4.1. Extend the `make()` helper to accept `state`, `hasEvolved`, `neglectTicks`, `careTicks` (all optional with sensible defaults).
4.2. Add a `describe('reducer — HEAL')` block covering:

- HEAL outside Sick is a no-op (identity return) from Normal and from Evolved.
- HEAL from Sick restores vitals `<50` up to 50, leaves `>=50` vitals untouched, and resets counters to 0.
- HEAL from Sick with `hasEvolved === true` returns `state === 'Evolved'`.
- HEAL from Sick with `hasEvolved === false` returns `state === 'Normal'`.

4.3. Extend `describe('reducer — TICK while awake')`:

- **Neglect counter increments** when a vital is at or below 10 and resets when it recovers above 10.
- **Normal → Sick atomicity**: starting from `{ hunger: 8, neglectTicks.hunger: SICK_NEGLECT_TICKS - 1, state: 'Normal' }`, dispatch one `TICK` of `elapsedMs = TICK_INTERVAL_MS`. Assert the returned state has `state === 'Sick'` AND `neglectTicks.hunger === SICK_NEGLECT_TICKS` on the **same** returned object — not across two dispatches.
- **Evolved → Sick atomicity**: same setup but `state: 'Evolved', hasEvolved: true`. Assert returned state has `state === 'Sick'` AND `hasEvolved === true` on the same object.
- **Normal → Evolved atomicity**: starting from `{ hunger: 80, happiness: 80, energy: 80, careTicks: EVOLVE_CARE_TICKS - 1, state: 'Normal', hasEvolved: false }`, dispatch one `TICK`. Assert returned state has `state === 'Evolved'` AND `hasEvolved === true` on the same object.
- **hasEvolved is one-way**: from `{ hasEvolved: true, state: 'Evolved' }` over many TICKs (including Sick transitions), `hasEvolved` is never set back to `false`.
- **Evolved does not re-evolve**: from `{ state: 'Evolved', hasEvolved: true, careTicks: 0, vitals all 100 }`, after `EVOLVE_CARE_TICKS + 5` ticks of care, `careTicks` stays at 0 (because the careTicks rule requires `prev.state === 'Normal'`).

4.4. Extend `describe('reducer — TICK while resting')`:

- **Rest pauses neglect counters**: starting from `{ hunger: 5, neglectTicks.hunger: 3, isResting: true }`, dispatch several TICKs. Assert `neglectTicks.hunger` stays at 3 (paused, not reset).
- **Rest pauses care counter**: starting from `{ vitals all 80, careTicks: 10, isResting: true, state: 'Normal' }`, dispatch several TICKs. Assert `careTicks` stays at 10.

4.5. Add a `describe('reducer — forbidden transitions')` block:

- `Evolved → Normal` never happens via TICK or HEAL. (Assert across randomized care/neglect sequences.)
- `Sick → Normal` never happens via TICK alone — only via HEAL.
- HEAL outside Sick never changes `state` or `hasEvolved`.

## 5. Add `tests/game/states.test.ts`

5.1. Unit-test `nextState()` in isolation:

- Identity when nothing trips: `{ prev: 'Normal', hasEvolved: false, neglectTicks: all 0, careTicks: 0 }` → `{ state: 'Normal', hasEvolved: false }`.
- Sick trip fires from Normal when any counter `>= SICK_NEGLECT_TICKS`.
- Sick trip fires from Evolved too; `hasEvolved` stays true.
- Once `prev === 'Sick'`, the function returns Sick even if counters are all 0 (only HEAL, which lives in the reducer, exits Sick).
- Evolve trip only fires from `Normal && !hasEvolved && careTicks >= EVOLVE_CARE_TICKS`. Same call with `hasEvolved: true` returns `Normal` unchanged.
- `nextState` is pure: calling it twice with the same input returns structurally equal outputs; it never calls `Date.now()`, `Math.random()`, or any I/O.

## 6. Update `<Pet />` for per-state visuals

6.1. `src/components/Pet.tsx`:

- Import `useTamagotchi`.
- Set the outer `<svg>`'s `data-state={state}`.
- Compute `moodLabel` from `{ Normal: 'idling', Sick: 'sick', Evolved: 'thriving' }` and use it in `aria-label={'Tiny tamagotchi, ' + moodLabel}`.
- When `state === 'Evolved'`, render a small `<path data-testid="crown" aria-hidden="true" />` sibling inside the same `<svg>` (a 3-point pixel crown, filled with `var(--pet-crown)`).
- `<Pet />` stays a client-capable component but continues to avoid `"use client"` directly — it renders via the existing client page.

6.2. `src/styles/pet.module.css`:

- Add three `[data-state="Normal"] { --pet-fill: ...; --pet-eye: ...; --pet-mouth: ...; --pet-crown: transparent; }` rules, plus `Sick` (muted green/grey) and `Evolved` (gold, crown `#fbbf24`).
- Keep the existing `bob` keyframe and the `prefers-reduced-motion` override untouched.

6.3. In `<PetStage />`, render a conditional `<span data-testid="sick-indicator" aria-hidden="true">•••</span>` when `useTamagotchi().state.state === 'Sick'`. Absent otherwise.

## 7. Add `<HealButton />`

7.1. `src/components/HealButton.tsx`:

- `"use client"`.
- If `state.state !== 'Sick'`, return `null`.
- Else render `<ActionButton label="Heal" onPress={() => dispatch({ type: 'HEAL' })} />`.

## 8. Add a11y state announcer

8.1. In `src/app/page.tsx`, add a new component `<StateAnnouncer />` (defined inline in the page file):

- Reads `state.state` via `useTamagotchi()`.
- Uses a `useRef` + `useEffect([state])` pattern: when the current state differs from the previous ref, compute `text = 'Pet is now ' + state`. Render `<div role="status" aria-live="polite" data-testid="state-announcer">{text}</div>`.
- Initial render text is the empty string (no announcement on first paint).

8.2. Wire `<HealButton />` into the page button row, **after** `<RestButton />`.

## 9. Component tests

9.1. `tests/components/Pet.test.tsx`: update — for each of the three states, render `<TamagotchiProvider>` with a preloaded state (tiny test harness that wraps a forced state) and assert:

- `<svg>` has `data-state="Normal" | "Sick" | "Evolved"`.
- `aria-label` matches `/tiny tamagotchi, idling/i`, `/tiny tamagotchi, sick/i`, `/tiny tamagotchi, thriving/i`.
- Crown `data-testid="crown"` is present only when `state === 'Evolved'`.
- The `pet` CSS Module class (regex-matched) is still applied on all three states — guards Phase 1's linkage.

9.2. `tests/components/HealButton.test.tsx` (new):

- When `state !== 'Sick'`, the container is empty (no button in the DOM).
- When `state === 'Sick'`, a button with name `Heal` renders, is enabled, dispatches HEAL on click, and vitals `<50` are raised to 50.

9.3. `tests/components/StateAnnouncer.test.tsx` (new):

- Initial render: `data-testid="state-announcer"` has empty text content.
- After a simulated state change to Sick, text becomes `Pet is now Sick`. After a change to Normal, text becomes `Pet is now Normal`.
- The element has `role="status"` and `aria-live="polite"`.

9.4. Update existing `tests/components/FeedButton.test.tsx` / `PlayButton.test.tsx` / `RestButton.test.tsx` **only** to tolerate the richer `PetModel` shape in the `make()` helper (no new button behaviors). Feed and Play explicitly are **not** disabled by `Sick` — add a test to `FeedButton.test.tsx` that asserts Feed still works when `state === 'Sick'`.

## 10. Test-only seed harness (`?__seed=...`)

10.1. `src/hooks/useTamagotchi.tsx` reads `window.location.search` **once** on mount inside a `useEffect`. If `URLSearchParams` contains a `__seed` key matching one of the allowed names below, dispatch a `__SEED__` action with a hard-coded preset. Unknown seed names are ignored (no-op). The harness is active in all environments — the browser-verification script and certain integration tests use it; production builds still ship the code path, but no standard user flow produces a `?__seed=` URL.
10.2. Allowed seeds (exhaustive list, hard-coded in `useTamagotchi.tsx`):

- `?__seed=evolve-near` → `{ vitals: { hunger: 80, happiness: 80, energy: 80 }, careTicks: EVOLVE_CARE_TICKS - 1, state: 'Normal', hasEvolved: false }`.
- `?__seed=sick-near` → `{ vitals: { hunger: 5, happiness: 50, energy: 50 }, neglectTicks: { hunger: SICK_NEGLECT_TICKS - 1, happiness: 0, energy: 0 }, state: 'Normal' }`.
- `?__seed=evolved-near-sick` → `{ vitals: { hunger: 5, happiness: 50, energy: 50 }, neglectTicks: { hunger: SICK_NEGLECT_TICKS - 1, happiness: 0, energy: 0 }, state: 'Evolved', hasEvolved: true }`.

10.3. Implement `__SEED__` as a new reducer action whose payload is the preset name. The reducer resolves the name to the preset object (exhaustive switch) and merges it into the current state. `__SEED__` is the **only** reducer action that writes `state` / `hasEvolved` directly without going through `states.nextState()`; a scope-contract comment anchors this exception.
10.4. Unit-test the seed handler: dispatching `{ type: '__SEED__', preset: 'evolve-near' }` into `initialState` returns a PetModel matching the preset; dispatching `{ type: '__SEED__', preset: 'unknown' }` returns input identity.
10.5. Add a test that asserts the `useEffect` reads the URL exactly once on mount (no re-read on re-render; guards against accidental seed re-application).

## 11. Integration test

11.1. `tests/integration/state-machine.test.tsx` (new):

- **Normal → Sick → HEAL → Normal**: render `<Home />` under fake timers, preload via direct `__SEED__` dispatch (test helper around `?__seed=sick-near`), advance `SICK_NEGLECT_TICKS + 1` ticks, assert `state === 'Sick'` via the announcer text and Pet's `data-state`, click Heal, assert state back to Normal and Hunger >= 50.
- **Normal → Evolved**: preload `evolve-near`, advance one TICK, assert Evolved trips atomically on the crossing tick.
- **Evolved → Sick → HEAL → Evolved**: preload `evolved-near-sick`, advance one TICK to Sick, click Heal, assert final state is back to Evolved with crown in the DOM.
- **hasEvolved never flips false**: randomized mini-loop dispatching 100 TICKs interleaved with occasional Feed/Rest starting from an Evolved seed; at every intermediate assertion, `hasEvolved` stays `true`.

## 12. Update `tests/hooks/useTamagotchi.test.tsx` minimally

12.1. Add one test: after a simulated long awake period with low Hunger, `state.state === 'Sick'` flows through the provider into a child reader. Confirms the provider propagates state changes.

## 13. Wire page + full green bar

13.1. Run `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build`. All exit 0.
13.2. Confirm tests added: ≥15 new tests (state machine pure tests, HEAL branches, atomic Sick/Evolve transitions, forbidden-transition assertions, Pet visual state, HealButton lifecycle, StateAnnouncer, seed harness, integration). Total suite rises from 50 (Phase 3) to ≥65.
13.3. Update `CHANGELOG.md` with Phase 4 bullets before merging.
13.4. Suggested commit breakdown:

- `feat(phase-4): add PetState, hasEvolved, counters, and HEAL action to game model`
- `feat(phase-4): add src/game/states.ts pure state machine`
- `feat(phase-4): wire reducer TICK/HEAL through states.nextState`
- `feat(phase-4): Pet per-state visuals via data-state + Evolved crown`
- `feat(phase-4): add HealButton (conditional render) and StateAnnouncer a11y bridge`
- `test(phase-4): cover every allowed transition, assert every forbidden one`
- `test(phase-4): Pet/HealButton/StateAnnouncer component tests + integration`
- `docs(phase-4): record phase 4 in changelog`
