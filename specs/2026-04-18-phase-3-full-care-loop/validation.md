# Phase 3 — Full Care Loop: Validation

## Automated

Run from `tiny-tamagotchi/`. Every command must exit with code 0.

| Command             | Must produce                                                                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`         | Zero errors, zero warnings.                                                                                                                                                        |
| `pnpm typecheck`    | `tsc --noEmit` passes.                                                                                                                                                             |
| `pnpm format:check` | Prettier reports all files formatted.                                                                                                                                              |
| `pnpm test`         | All prior tests still pass plus Phase 3 reducer branches, ActionButton / PlayButton / RestButton component tests, and the care-loop integration test. Zero failures, zero skipped. |
| `pnpm build`        | Next.js production build succeeds.                                                                                                                                                 |

### Specific assertions

- `src/game/state.ts` `Vitals` has exactly three numeric fields: `hunger`, `happiness`, `energy`. `PetModel` includes `isResting: boolean`.
- `Action` union equals `{ type: 'FEED' } | { type: 'PLAY' } | { type: 'REST' } | { type: 'TICK'; elapsedMs: number }`. No `HEAL`, no `RESET`.
- `src/game/constants.ts` exports `CARE_AMOUNTS`, `PLAY_MIN_ENERGY`, `REST_RECOVERY_PER_TICK`.
- Reducer clamps every branch to `[0, 100]` and never produces non-integer stats.
- Reducer: FEED/PLAY are no-ops while `isResting`; REST toggles; TICK while resting only changes energy.
- **Auto-wake is atomic**: a single `TICK` from `{ energy: 95, isResting: true }` returns a state where `energy === 100` **and** `isResting === false` on the same object. No two-step dance required. A dedicated test in `tests/game/reducer.test.ts` asserts both fields on one reducer output.
- `src/components/ActionButton.tsx` sets `aria-disabled` and passes `title` only when `disabled` is true.
- `RestButton` label toggles between `"Rest"` and `"Wake"` based on `isResting`.
- `src/app/page.tsx` renders the three StatBars in the exact order Hunger, Happiness, Energy, and the three buttons in the order Feed, Play, Rest.
- No new dependencies in `package.json`.
- No references to `localStorage`, no `HEAL`/`RESET`/`SICK`/`EVOLVED` strings, no route changes.

## Manual

### Walkthrough

1. `pnpm dev` → `http://localhost:3000`.
2. Initial state: all three bars at 100. Feed disabled (reason `"Pet is full"`), Play enabled, Rest enabled.
3. Wait 3–6 seconds: all three bars drop 1 per tick.
4. Click **Feed** once: Hunger = 100 (clamped), Happiness +5. Feed re-disables.
5. Click **Play**: Happiness = 100 (clamped), Energy -15. Feed button is enabled again (hunger can now drop on next tick).
6. Spam **Play** until Energy < 10: Play becomes disabled with title `"Too tired to play"`.
7. Click **Rest**: label becomes `"Wake"`, Feed and Play show disabled reason `"Pet is resting"`. Vitals Hunger and Happiness freeze; Energy climbs by 10 each tick.
8. Let Energy hit 100: `isResting` clears automatically; label returns to `"Rest"`; Feed and Play re-enable.
9. Click **Rest** mid-recovery, then click **Wake**: pet wakes immediately; vitals that were not decaying during rest resume decay.
10. `pnpm build && pnpm start` shows identical behavior.

### Behavior

- No console errors or React warnings.
- Numeric readouts always integers.
- Button disabled titles match the specified strings exactly.

### Accessibility

- Each StatBar announces as `progressbar` with the correct `aria-label`.
- Each action button is keyboard reachable; disabled buttons announce as disabled; `title` is exposed to screen readers via the button's accessible name when focused.
- `prefers-reduced-motion: reduce` still stops the idle bob but does not affect action responsiveness.

### Edge cases

- Opening devtools while resting with Energy near 100: the same TICK that reaches 100 also clears `isResting`; no double-button flicker.
- Rapidly clicking Play at Energy = 10 → Energy drops to 0 (not negative), button disables, reason shown.
- Leaving the tab focused but idle for 10 minutes: all three vitals sit at 0, no crash, no negatives.

### Browser verification (webapp-testing skill)

Run **after** the automated suite passes and **before** merging. Phase 3 adds the most interaction surface yet (three vitals, three buttons, resting mode, disabled reasons). jsdom's `user-event` integration test covers reducer-level flows, but only a real browser proves focus management, `title`-attribute tooltips, and live-region updates of `aria-valuenow` across three StatBars.

Load the skill and run `scripts/with_server.py --server "pnpm dev" --port 3000 -- python phase-3-browser.py`. The script performs:

1. **Baseline**: navigate to `http://localhost:3000`, `wait_for_load_state('networkidle')`, screenshot `/tmp/phase-3-initial.png`.
2. **Bar ordering and initial values**: query all `role=progressbar` elements; assert their `aria-label`s in document order are exactly `["Hunger", "Happiness", "Energy"]` and each has `aria-valuenow="100"`.
3. **Button ordering and initial disabled state**: query all `role=button`; assert the visible labels in document order are `["Feed", "Play", "Rest"]`. Assert Feed is disabled with `title="Pet is full"`.
4. **Care-loop sequence** (assert `aria-valuenow` and disabled state after each step):
   - Wait ≥1 tick; assert all three bars dropped.
   - Click **Feed** → Hunger=100, Feed re-disables with `title="Pet is full"`.
   - Click **Play** until Energy < 10 → Play becomes disabled with `title="Too tired to play"`.
   - Click **Rest** → `Rest` button's visible text becomes `Wake`. Feed and Play now show `title="Pet is resting"` and are disabled. Hunger/Happiness bars' `aria-valuenow` stops changing across two ticks; Energy bar's `aria-valuenow` increases.
   - Wait until Energy reaches 100 → the button's visible text flips back to `Rest` automatically. Feed and Play re-enable.
5. **Atomic auto-wake**: repeat step 4 at the auto-wake boundary. In a single `wait_for_timeout` step, assert the DOM transitions from `Wake` + Energy<100 to `Rest` + Energy=100 without any intermediate `Wake` + Energy=100 state observable on the next paint (use `page.wait_for_function` polling `aria-valuenow` and button text together).
6. **Keyboard a11y**: tab through the page; assert each of the three buttons is focusable; assert `aria-disabled="true"` buttons still announce their reason via the button's accessible name + description.
7. **Console audit**: zero errors, zero warnings, zero `pageerror` events.
8. **Final screenshot** `/tmp/phase-3-final.png` for the PR.

A passing run of this script is the gate for merging Phase 3.

## Tone check

New copy introduced: stat labels `"Happiness"`, `"Energy"`; button labels `"Play"`, `"Rest"`, `"Wake"`; disabled reasons `"Pet is full"`, `"Pet is resting"`, `"Too tired to play"`.

- Exact spelling, title case on labels, sentence case on reasons.
- No emoji, no marketing voice.
- No additional copy beyond this list.

## Scope Contract check

Confirm Phase 3 introduced **nothing** from the 🚫 list in `mission.md`:

- No auth, users, accounts.
- No multi-pet data, inventories, currencies.
- No notifications APIs, mini-games, social features.
- No admin routes or debug UI.
- No permadeath (any vital at 0 just stays at 0).
- No Sick / Evolved logic (reserved for Phase 4).
- No HEAL / RESET actions (reserved for Phase 4 / 5).
- No persistence, no naming (reserved for Phase 5).
- No Easter eggs or idle-animation variants (reserved for Phase 6).

If any of the above appears in the diff, **fail** validation and remove it.

## Definition of Done

Phase 3 is complete when **all** of the following are true:

- [ ] Branch `phase-3-full-care-loop` contains only Phase 3 commits.
- [ ] Every command in the **Automated** table exits 0 on a fresh clone.
- [ ] Every **Specific assertion** holds true.
- [ ] The **Manual walkthrough** matches exactly, including auto-wake and wake-early behavior.
- [ ] **Tone check** passes.
- [ ] **Browser verification via `webapp-testing` skill** ran clean: bar ordering, button ordering, care-loop sequence, atomic auto-wake (no intermediate Wake+Energy=100 state visible), keyboard a11y, zero console errors.
- [ ] **Scope Contract check** passes.
- [ ] `CHANGELOG.md` has new bullets summarizing Phase 3 deliverables.
- [ ] No TODO/FIXME comments left in the diff.
- [ ] `specs/roadmap.md` Phase 3 deliverables can honestly be ticked.
