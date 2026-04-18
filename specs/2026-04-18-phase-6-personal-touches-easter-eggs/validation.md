# Phase 6 -- Personal Touches and Easter Eggs: Validation

## Automated

Run from `tiny-tamagotchi/`. Every command must exit with code 0.

| Command             | Must produce                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm lint`         | Zero errors, zero warnings.                                                                  |
| `pnpm typecheck`    | `tsc --noEmit` passes.                                                                       |
| `pnpm format:check` | Prettier reports all files formatted.                                                        |
| `pnpm test`         | All prior tests still pass plus all Phase 6 tests listed below. Zero failures, zero skipped. |
| `pnpm build`        | Next.js production build succeeds.                                                           |

### Specific assertions

**Constants**

- `src/game/constants.ts` exports `EGG_MAX_STREAK_WINDOW_MS`, `QUEASY_DURATION_MS`, `SLEEP_CAP_WINDOW_MINUTES`, `SLEEP_CAP_DURATION_MS`, `CONFETTI_DURATION_MS` with the exact values specified in requirements.

**Action shapes**

- `Action` union in `src/game/state.ts` has `{ type: 'FEED'; nowMs: number }`, `{ type: 'PLAY'; nowMs: number }`, `{ type: 'REST'; nowMs: number }`, `{ type: 'HEAL'; nowMs: number }`. No action carries `nowMs` without the type guard.

**PetModel fields**

- `PetModel` includes `feedStreak: { count: number; lastFeedAt: number }`, `queasyUntil: number`, `sleepCapUntil: number`.
- `initialState` has `feedStreak: { count: 0, lastFeedAt: 0 }`, `queasyUntil: 0`, `sleepCapUntil: 0`.

**Reducer: FEED streak**

- 9 consecutive FEEDs within `EGG_MAX_STREAK_WINDOW_MS`: `queasyUntil === 0`.
- 10th consecutive FEED within the window: `queasyUntil === nowMs + QUEASY_DURATION_MS`.
- FEED with gap exceeding `EGG_MAX_STREAK_WINDOW_MS`: `feedStreak.count` resets to 1, `queasyUntil` unchanged.
- PLAY, REST, HEAL each reset `feedStreak.count` to 0.

**Reducer: stat-unchanged invariants (prose-to-test)**

- Dispatch 10 FEEDs to activate queasy. Assert `state.vitals` after the 10th FEED equals exactly what 10 pure Phase 3 FEEDs would produce (hunger clamped at 100, happiness clamped at 100 or at the Phase 3 delta sum, whichever is lower). Assert `state.state` (from Phase 4) is unchanged. Assert `state.hasEvolved` is unchanged.
- Dispatch the full Konami key sequence. Assert every field of the reducer state is identical before and after: vitals, `feedStreak`, `queasyUntil`, `sleepCapUntil`, `state.state`, `hasEvolved`, `isResting`.
- Dispatch FEED with `nowMs` at 00:02 local. Assert `sleepCapUntil === nowMs + SLEEP_CAP_DURATION_MS`. Assert `state.vitals` matches exactly what a regular FEED produces at that moment (hunger +20 clamped, happiness +5 clamped).

**Reducer: midnight sleep-cap**

- FEED at 00:02 local: `sleepCapUntil` set.
- FEED at 00:05 local: `sleepCapUntil` NOT set (boundary exclusive).
- PLAY, REST, HEAL at 00:02 local: `sleepCapUntil` set.
- Any action at 01:00 local: `sleepCapUntil` NOT set.

**Personality hash**

- `petVariant(name)` returns a value in `{0, 1, 2}` for any non-empty string.
- `petVariant('Blob')` returns the same value across 50 calls (determinism).
- The pet SVG rendered with `state.name = 'Blob'` has a class matching `/pet-variant-[012]/`.

**Reaction animations**

- Dispatch FEED: `data-reaction="chomp"` is present on the pet SVG immediately after dispatch.
- Fire `animationend` on the SVG: `data-reaction` attribute is removed (or empty string).
- Dispatch PLAY: `data-reaction="hop"` present.
- Dispatch HEAL: `data-reaction="sparkle"` present.
- Under `prefers-reduced-motion: reduce`: dispatch FEED; `data-reaction="chomp"` is still present (attribute set for testability even though CSS zeroes the duration).

**Idle mini-animations**

- Under `prefers-reduced-motion: reduce`: advance 100 fake ticks; `data-idle-animation` attribute never appears on the SVG.
- Under no-preference: mock `Math.random` to return 0.01; advance 1 tick; `data-idle-animation` is one of `['yawn', 'blink', 'look-around']`.
- After 2 000 ms: `data-idle-animation` is cleared.

**Queasy overlay**

- `state.queasyUntil = Date.now() + 5_000`: advance 1 overlay tick; `data-egg="queasy"` present on SVG.
- `state.queasyUntil = Date.now() - 1`: advance 1 overlay tick; `data-egg` absent.

**Sleep-cap overlay**

- `state.sleepCapUntil = Date.now() + 5_000`: advance 1 overlay tick; `getByTestId('sleep-cap')` in document.
- `state.sleepCapUntil = Date.now() - 1`: advance 1 overlay tick; `queryByTestId('sleep-cap')` is null.

**KonamiListener**

- Full 10-key sequence: `getByTestId('konami-confetti')` appears.
- 9-key sequence: `queryByTestId('konami-confetti')` is null.
- After `CONFETTI_DURATION_MS`: `queryByTestId('konami-confetti')` is null.
- Under `prefers-reduced-motion: reduce`: full sequence fires; `getByTestId('konami-confetti')` contains `*`.
- After unmount: full sequence fires; `queryByTestId('konami-confetti')` is null (listener cleanup).

**No new dependencies**

- `package.json` has no new entries in `dependencies` or `devDependencies` vs Phase 5.

---

### Silent-break guards (§6.4)

Each guard below is a named test that catches a specific refactor without relying on the happy-path tests.

| Refactor scenario                                                       | Guard test                                                                                                                                    |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Someone adds +5 happiness to the queasy branch to make the egg "matter" | Stat-unchanged invariant: dispatch 10 FEEDs; assert `state.vitals.happiness` equals exactly the Phase 3 clamped result, not one point higher. |
| Someone skips clearing `data-reaction` on `animationend`                | Stale-reaction test: dispatch FEED; fire `animationend`; assert `data-reaction` attribute is absent.                                          |
| Someone removes the `prefers-reduced-motion` guard on idle animations   | Reduced-motion idle test: fake `matchMedia` returning reduce; advance 100 ticks; assert `data-idle-animation` never appears.                  |
| Someone changes the 10-feed streak threshold to 9 or 11                 | Exact-count test: 9 FEEDs assert `queasyUntil === 0`; 10th FEED asserts `queasyUntil > 0`.                                                    |
| Someone seeds variants via `Math.random()` instead of the name hash     | Determinism test: call `petVariant('Blob')` 50 times; assert all results are identical.                                                       |
| Someone drops the `removeEventListener` cleanup in `KonamiListener`     | Listener cleanup test: unmount; fire full sequence; assert confetti does not appear.                                                          |

---

## Manual

### Walkthrough

1. `pnpm dev` -- `http://localhost:3000`.
2. Name the pet (Phase 5 flow). Observe the pet SVG has one of three subtle tint variants based on the name.
3. Click **Feed** 10 times in rapid succession (within 30 seconds, no other action). The pet should display a queasy wobble overlay for 60 seconds. Vitals should reflect exactly 10 Feeds worth of hunger/happiness gain, nothing more.
4. Wait 60 seconds. The queasy overlay disappears.
5. Click **Play**, then click **Feed** 9 times. No queasy overlay (streak was reset by Play).
6. Click **Rest**. The `Zz` overlay appears. Click **Wake** (or wait for auto-wake). The `Zz` overlay disappears.
7. Click **Feed**. The chomp reaction plays for 0.6 seconds, then the attribute clears.
8. Click **Play**. The hop reaction plays for 0.6 seconds.
9. Trigger Sick (neglect the pet). Click **Heal**. The sparkle reaction plays for 1.2 seconds.
10. Wait for an idle animation to fire (up to ~20 seconds at 5% per second). Observe yawn, blink, or look-around.
11. Type the Konami code on the keyboard (up up down down left right left right b a). Confetti burst appears for 3 seconds.
12. Set the system clock to 00:02 local time (or use a test harness with `getNow` injection). Perform any action. The nightcap overlay appears on the pet for 10 seconds.
13. `pnpm build && pnpm start` -- identical behavior.

### Behavior

- No console errors or React warnings.
- Vitals never change as a result of any Phase 6 feature firing.
- `state.state` (Normal/Sick/Evolved) never changes as a result of any Phase 6 feature.
- `hasEvolved` never changes as a result of any Phase 6 feature.
- All overlays disappear after their specified durations.
- Rapid action clicks do not leave stale `data-reaction` attributes.

### Accessibility

- All decorative overlay elements have `aria-hidden="true"`.
- `KonamiListener` renders nothing in the DOM until triggered; it does not affect tab order.
- The sleep-cap `<path>` is inside the SVG and has `aria-hidden="true"`.
- Under `prefers-reduced-motion: reduce`: no idle animations fire; reaction attributes still appear (for testability) but CSS zeroes their duration; confetti collapses to a static flash; queasy and sleep-cap overlays appear without motion.

### Edge cases

- Feeding exactly at the 30-second boundary: a FEED arriving at `nowMs - lastFeedAt === EGG_MAX_STREAK_WINDOW_MS` resets the count (gap is not strictly less than the window).
- Feeding at 00:04:59 local: sleep-cap fires. Feeding at 00:05:00 local: sleep-cap does not fire.
- Konami code typed while queasy is active: confetti appears; queasy continues unaffected.
- Pet name is an empty string (edge case from Phase 5 reset flow): `petVariant('')` returns a valid value in `{0, 1, 2}` without throwing.
- Rapid Konami re-entry within `CONFETTI_DURATION_MS`: the overlay resets its timer (or is idempotent -- either behavior is acceptable as long as the overlay does not stack duplicate DOM nodes).

### Browser verification

Run after the automated suite passes and before merging. Load the skill and run `scripts/with_server.py --server "pnpm dev" --port 3000 -- python phase-6-browser.py`. The script performs:

1. **Baseline**: navigate to `http://localhost:3000`, `wait_for_load_state('networkidle')`, screenshot `/tmp/phase-6-initial.png`.
2. **Variant class**: query the pet SVG; assert its `class` attribute matches `/pet-variant-[012]/`.
3. **Reaction animations**: click Feed; assert `data-reaction="chomp"` appears on the SVG within 100 ms; wait for `animationend`; assert `data-reaction` is absent.
4. **Queasy egg**: click Feed 10 times within 30 seconds; assert `data-egg="queasy"` appears on the SVG; wait 61 seconds; assert `data-egg` is absent.
5. **Konami confetti**: dispatch the 10-key sequence via `page.keyboard.press` for each key; assert `[data-testid="konami-confetti"]` appears; wait 3.1 seconds; assert it is gone.
6. **Idle animation**: wait up to 30 seconds polling every 500 ms; assert `data-idle-animation` appears at least once on the SVG.
7. **Console audit**: zero errors, zero warnings, zero `pageerror` events.
8. **Final screenshot** `/tmp/phase-6-final.png` for the PR.

A passing run of this script is the gate for merging Phase 6.

## Tone check

New user-facing copy introduced in Phase 6: none. All Phase 6 features are visual only. No new labels, button text, or error messages.

Decorative overlay elements use `aria-hidden="true"` and carry no accessible text.

## Scope Contract check

Confirm Phase 6 introduced nothing from the list in `mission.md`:

- No stat change from any Phase 6 feature.
- No state-machine change (Normal/Sick/Evolved transitions unaffected).
- No new routes beyond `/`.
- No mini-games.
- No notifications.
- No new npm dependencies.
- No admin or debug UI.
- No permadeath.
- No sound effects (deferred to Phase 7).
- No social features, leaderboards, or sharing flows.

If any of the above appears in the diff, fail validation and remove it.

## Definition of Done

Phase 6 is complete when all of the following are true:

- [ ] Branch `phase-6-personal-touches-easter-eggs` contains only Phase 6 commits.
- [ ] Every command in the **Automated** table exits 0 on a fresh clone.
- [ ] Every **Specific assertion** holds true.
- [ ] All six **Silent-break guard** tests are present and passing.
- [ ] The **Manual walkthrough** matches exactly, including all three easter eggs and all four reaction animations.
- [ ] **Tone check** passes (no new user-facing copy).
- [ ] **Browser verification** ran clean: variant class, reaction animation lifecycle, queasy egg, Konami confetti, idle animation observed, zero console errors.
- [ ] **Scope Contract check** passes.
- [ ] `CHANGELOG.md` has new bullets summarizing Phase 6 deliverables.
- [ ] No TODO/FIXME comments left in the diff.
- [ ] `specs/roadmap.md` Phase 6 deliverables can honestly be ticked.
