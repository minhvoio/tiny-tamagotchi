# Phase 2 — One Living Vital (Hunger): Validation

## Automated

Run from `tiny-tamagotchi/`. Every command must exit with code 0.

| Command             | Must produce                                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`         | Zero errors, zero warnings.                                                                                                                    |
| `pnpm typecheck`    | `tsc --noEmit` passes.                                                                                                                         |
| `pnpm format:check` | Prettier reports all files formatted.                                                                                                          |
| `pnpm test`         | All Phase 0/1 tests still pass plus the new Phase 2 tests (reducer, useTick, useTamagotchi, StatBar, FeedButton). Zero failures, zero skipped. |
| `pnpm build`        | Next.js production build succeeds.                                                                                                             |

### Specific assertions

- `src/game/state.ts` defines `Stat`, `PetModel`, and an `Action` union of exactly `'FEED' | 'TICK'` in Phase 2 — co-located in this single file. No other action names present. `src/game/actions.ts` does **not** exist in Phase 2.
- `src/game/constants.ts` exports the five named constants with the agreed values (`MAX_STAT=100`, `MIN_STAT=0`, `TICK_INTERVAL_MS=3000`, `DECAY_PER_TICK=1`, `FEED_AMOUNT=20`).
- `src/game/reducer.ts` has **no** imports from `react`, `next`, or `@/hooks/*` (pure logic rule).
- The reducer clamps `hunger` to `[0, 100]` for both FEED and TICK in every test case in `reducer.test.ts`.
- `src/hooks/useTick.ts` calls `setInterval` and returns a cleanup that calls `clearInterval`.
- `src/hooks/useTamagotchi.tsx` starts with `"use client"`.
- `src/components/FeedButton.tsx` starts with `"use client"`; other new UI files only use client directive if strictly required.
- `src/components/StatBar.tsx` sets `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`.
- `src/app/page.tsx` wraps its content in `<TamagotchiProvider>` exactly once.
- No new runtime dependencies added to `package.json`; no Zustand, no Framer Motion.
- `src/game/` contains no persistence, no `localStorage`, no `window` references.

## Manual

### Walkthrough

1. `pnpm dev` → `http://localhost:3000`.
2. Observe initial state: title, bobbing pet, Hunger bar showing `100 / 100`, a `Feed` button that is disabled.
3. Wait ~3s: hunger drops to 99. Continue watching: it ticks down 1 per 3 s.
4. Click **Feed** once: hunger jumps by exactly 20 (clamped at 100).
5. Keep clicking Feed rapidly — bar never exceeds 100; button re-disables at 100.
6. Leave the page for ~5 min; hunger floors at 0 and stays there (no crash, no negative values).
7. Stop dev, run `pnpm build && pnpm start`; same behavior on the prod server.

### Behavior

- No console errors or React warnings.
- Numeric readout always shows an integer (`42 / 100`, never `41.67`).
- Feed dispatches only when enabled; disabled button is focusable only if Tab lands on it but produces no state change when pressed.

### Accessibility

- `<Pet />` still reports as `img` with `aria-label` (from Phase 1).
- StatBar reports as `progressbar` with `aria-valuenow` updating live; screen reader (VoiceOver or NVDA) announces changes when focused.
- Feed button is reachable by keyboard; Enter/Space trigger FEED; disabled state is announced.

### Edge cases

- Opening devtools **Throttle → Offline** does not crash the app (ticks keep running; no network fetches required).
- Toggling `prefers-reduced-motion` reduces pet bob but does not affect Hunger tick or Feed behavior.
- Fake timer advancement in `useTick.test.tsx` proves cleanup: after unmount + `vi.advanceTimersByTime(10_000)`, no further dispatches occur.

### Browser verification (webapp-testing skill)

Run **after** the automated suite passes and **before** merging. Vitest validates the reducer, provider, and components in jsdom, but only a real browser proves that the `setInterval` actually fires in production, that React commits re-render the StatBar with the new `aria-valuenow`, and that `FeedButton`'s `disabled` state updates live.

Load the skill and run `scripts/with_server.py --server "pnpm dev" --port 3000 -- python phase-2-browser.py`. The script performs, using the reconnaissance-then-action pattern:

1. **Baseline**: navigate to `http://localhost:3000`, `wait_for_load_state('networkidle')`, screenshot `/tmp/phase-2-initial.png`.
2. **Initial-state assertions**:
   - `page.get_by_role('progressbar', name='Hunger')` exists with `aria-valuenow="100"`, `aria-valuemin="0"`, `aria-valuemax="100"`.
   - `page.get_by_role('button', name='Feed')` is disabled at start (hunger is 100).
3. **Decay over time**: `page.wait_for_timeout(6500)` (≈2 ticks at 3 s), then re-read `aria-valuenow`. Assert it dropped by at least 1 and by no more than 3. Screenshot `/tmp/phase-2-decayed.png`.
4. **Feed action**:
   - `page.get_by_role('button', name='Feed').click()`.
   - Immediately re-read `aria-valuenow`; assert new value = previous + 20 (clamped to 100).
   - If the value clamped to 100, assert the button is disabled again.
5. **Clamp boundary**: click Feed repeatedly until hunger is 100; assert `aria-valuenow` never exceeds 100 and the button ends disabled.
6. **Long-idle floor**: navigate to a fresh page context, wait enough ticks to drain hunger below 10, then wait further. Assert `aria-valuenow` reaches `"0"` and stays `"0"` across subsequent reads (no negatives, no permadeath surface).
7. **Console audit**: zero console errors, zero React warnings, zero `pageerror` events throughout.

A passing run of this script is the gate for merging Phase 2. Commit the final screenshots under the PR description.

## Tone check

New user-facing strings: **"Hunger"** (stat label) and **"Feed"** (button label).

- Exact spelling, title case, no emoji, no filler words.
- No additional copy introduced (no toasts, no tooltips).

## Scope Contract check

Confirm Phase 2 introduced **nothing** from the 🚫 list in `mission.md`:

- No auth, users, accounts.
- No multi-pet data, inventories, currencies.
- No notifications APIs, mini-games, social features.
- No admin routes or debug UI.
- No permadeath (hunger floors at 0 and stays).
- No Happiness/Energy logic (reserved for Phase 3).
- No Sick/Evolved state (reserved for Phase 4).
- No persistence, no naming, no offline catch-up (reserved for Phase 5).

If any of the above appears in the diff, **fail** validation and remove it.

## Definition of Done

Phase 2 is complete when **all** of the following are true:

- [ ] Branch `phase-2-hunger-vital` contains only Phase 2 commits.
- [ ] Every command in the **Automated** table exits 0 on a fresh clone.
- [ ] Every **Specific assertion** holds true.
- [ ] The **Manual walkthrough** matches exactly, including rapid-feed and long-idle behavior.
- [ ] **Tone check** passes.
- [ ] **Scope Contract check** passes.
- [ ] **Browser verification via `webapp-testing` skill** ran clean: decay over time, feed delta, clamp boundary, long-idle floor, zero console errors.
- [ ] `CHANGELOG.md` has new bullets summarizing Phase 2 deliverables.
- [ ] No TODO/FIXME comments left in the diff.
- [ ] `specs/roadmap.md` Phase 2 deliverables can honestly be ticked.
