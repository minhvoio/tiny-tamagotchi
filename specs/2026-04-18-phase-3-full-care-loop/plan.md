# Phase 3 — Full Care Loop: Plan

Extend Phase 2's core to cover three vitals, three actions, and the resting mode. Build and test each rule before touching UI.

---

## 1. Extend types and constants (non-breaking)

1.1. In `src/game/state.ts`:

- Extend `Vitals` to `{ hunger: Stat; happiness: Stat; energy: Stat }`.
- Add `isResting: boolean` to `PetModel`.
- Extend `Action` union: `{ type: 'PLAY' } | { type: 'REST' }`.
- Update `initialState`: all vitals 100, `isResting: false`.
  1.2. In `src/game/constants.ts`:
- Add `PLAY_MIN_ENERGY = 10`.
- Add `REST_RECOVERY_PER_TICK = 10`.
- Add `CARE_AMOUNTS` object: <br>`{ feed: { hunger: 20, happiness: 5 }, play: { happiness: 20, energy: -15 } }`.
- Keep `FEED_AMOUNT` only if still referenced; otherwise remove and replace references with `CARE_AMOUNTS.feed.hunger`.
  1.3. Run `pnpm typecheck` — existing code may fail; next step will fix.

## 2. Extend the reducer (test-first)

2.1. In `tests/game/reducer.test.ts`, add new describe blocks:

- `FEED`: when `isResting`, returns state unchanged. When awake, adds feed deltas, clamps.
- `PLAY`: when `isResting`, no-op. When `energy < PLAY_MIN_ENERGY`, no-op. Else apply deltas, clamp (energy never below 0).
- `REST`: from `isResting=false` → sets `true`, no other changes. From `isResting=true` → sets `false`, no other changes.
- `TICK` while resting: adds `REST_RECOVERY_PER_TICK` to energy, clamps at 100; other vitals unchanged; if energy reaches 100, `isResting` becomes false in the same step.
- **Auto-wake atomicity test** (explicit, new): starting from `{ energy: 95, isResting: true }`, dispatch one `TICK` with `elapsedMs = TICK_INTERVAL_MS`. Assert the returned state satisfies **both** `energy === 100` **and** `isResting === false` on the same reducer output — not across two dispatches. Guards against future splits that would require a second TICK to clear the flag.
- `TICK` while awake: decays all three vitals; unchanged behavior for hunger preserved from Phase 2.
  2.2. Update `src/game/reducer.ts` to implement the rules. Keep branches in the order `FEED | PLAY | REST | TICK`.
  2.3. Run `pnpm test` — reducer tests go green. Phase 2 assertions remain green.

## 3. Generalize the button component

3.1. Create `src/components/ActionButton.tsx`:

- Props: `{ label: string; onPress: () => void; disabled?: boolean; disabledReason?: string }`.
- Renders `<button type="button" aria-disabled={disabled} disabled={disabled} title={disabled ? disabledReason : undefined} onClick={onPress}>{label}</button>`.
  3.2. Refactor `src/components/FeedButton.tsx` to use `<ActionButton />`:
- Disabled if `state.vitals.hunger >= MAX_STAT` or `state.isResting`.
- Reason: `"Pet is resting"` (takes priority) else `"Pet is full"`.
  3.3. Create `src/components/PlayButton.tsx`:
- Disabled if `state.isResting` or `state.vitals.energy < PLAY_MIN_ENERGY`.
- Reason: `"Pet is resting"` else `"Too tired to play"`.
  3.4. Create `src/components/RestButton.tsx`:
- Label: `state.isResting ? 'Wake' : 'Rest'`.
- Always enabled; dispatches `{ type: 'REST' }`.

## 4. Extend component tests

4.1. `tests/components/ActionButton.test.tsx` (new):

- Click dispatches the handler when enabled.
- When `disabled`, the button has `aria-disabled="true"`, the handler is not called, and `title` equals `disabledReason`.
  4.2. Update `tests/components/FeedButton.test.tsx` (from Phase 2):
- Still asserts basic click → hunger increments.
- Add a case: when `isResting`, FEED is a no-op and the button is disabled with reason `"Pet is resting"`.
  4.3. `tests/components/PlayButton.test.tsx` (new):
- Enabled when energy ≥ 10 and not resting; click increases happiness and drops energy by 15.
- Disabled at energy = 5 (reason `"Too tired to play"`).
- Disabled while resting (reason `"Pet is resting"`).
  4.4. `tests/components/RestButton.test.tsx` (new):
- Default label "Rest"; clicking sets `isResting=true` and label becomes "Wake".
- Clicking "Wake" sets `isResting=false`.

## 5. Integration test: full care cycle

5.1. Create `tests/integration/care-loop.test.tsx`:

- Render the `/` page (or a harness that mirrors it) inside `<TamagotchiProvider tickIntervalMs={1000}>`.
- Use `userEvent` with fake timers:
  - Wait for 2 ticks → hunger 98, happiness 98, energy 98.
  - Click **Feed** → hunger 100 (clamped), happiness +5.
  - Click **Play** → happiness +20 (clamped), energy -15.
  - Click **Rest** → `isResting=true`; label becomes "Wake".
  - Advance 3 ticks while resting → energy climbs by 30, other vitals unchanged.
  - Enough ticks to reach energy=100 → `isResting=false`; label back to "Rest".
- Assert throughout that no stat ever goes below 0 or above 100.

## 6. Wire the page

6.1. Update `src/app/page.tsx` to render, inside `<TamagotchiProvider>`:

- Title.
- `<PetStage><Pet /></PetStage>`.
- Three `<StatBar>`s in order Hunger, Happiness, Energy, each bound to `state.vitals.*`.
- A row of `<FeedButton />`, `<PlayButton />`, `<RestButton />` with consistent spacing.
  6.2. Delete the one-off `<HungerBar />` helper from Phase 2 if it still exists; use three bars directly.
  6.3. `pnpm dev` sanity check: click through Feed/Play/Rest; observe expected numeric changes.

## 7. Full green-bar verification

7.1. Run: `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build`. All exit 0.
7.2. Confirm tests added: reducer branches (FEED/PLAY/REST/TICK resting/awake), ActionButton, PlayButton, RestButton, and care-loop integration. Total count rises by ~10+ tests vs Phase 2.
7.3. Update `CHANGELOG.md` with Phase 3 bullets before merging.
7.4. Suggested commit breakdown:

- `feat(phase-3): extend Vitals, add isResting, PLAY/REST actions`
- `feat(phase-3): extend reducer with cross-effects and resting mechanic`
- `feat(phase-3): introduce ActionButton; add PlayButton and RestButton`
- `feat(phase-3): render three StatBars and three action buttons on home page`
- `test(phase-3): expand reducer tests and add component + care-loop integration tests`
- `docs(phase-3): record phase 3 in changelog`
