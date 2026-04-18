# Phase 6 -- Personal Touches and Easter Eggs: Plan

Add personality to the pet through CSS animations and DOM attribute changes. Build and test each feature group before wiring the next. No group touches stats or the state machine.

---

## 1. Extend types, constants, and action shapes

1.1. In `src/game/constants.ts`, add:

```ts
export const EGG_MAX_STREAK_WINDOW_MS = 30_000;
export const QUEASY_DURATION_MS = 60_000;
export const SLEEP_CAP_WINDOW_MINUTES = 5;
export const SLEEP_CAP_DURATION_MS = 10_000;
export const CONFETTI_DURATION_MS = 3_000;
```

1.2. In `src/game/state.ts`:

- Change `{ type: 'FEED' }` to `{ type: 'FEED'; nowMs: number }`.
- Change `{ type: 'PLAY' }` to `{ type: 'PLAY'; nowMs: number }`.
- Change `{ type: 'REST' }` to `{ type: 'REST'; nowMs: number }`.
- Change `{ type: 'HEAL' }` to `{ type: 'HEAL'; nowMs: number }`.
- Add to `PetModel`:
  ```ts
  feedStreak: {
    count: number;
    lastFeedAt: number;
  }
  queasyUntil: number; // epoch ms; 0 when inactive
  sleepCapUntil: number; // epoch ms; 0 when inactive
  ```
- Update `initialState`: `feedStreak: { count: 0, lastFeedAt: 0 }`, `queasyUntil: 0`, `sleepCapUntil: 0`.

  1.3. Run `pnpm typecheck` -- existing call sites will fail; the next steps fix them.

---

## 2. Extend the reducer (test-first)

2.1. In `tests/game/reducer.test.ts`, add describe blocks for Phase 6 rules:

**FEED streak and queasy:**

- FEED with `nowMs` within `EGG_MAX_STREAK_WINDOW_MS` of `lastFeedAt` increments `feedStreak.count`.
- FEED with `nowMs - lastFeedAt > EGG_MAX_STREAK_WINDOW_MS` resets count to 1.
- PLAY, REST, HEAL each reset `feedStreak.count` to 0.
- **Exact-count test (silent-break guard):** dispatch 9 consecutive FEEDs within the window; assert `queasyUntil === 0`. Dispatch the 10th; assert `queasyUntil === nowMs + QUEASY_DURATION_MS`. This test catches anyone who changes the threshold to 9 or 11.
- **Stat-unchanged invariant (prose-to-test):** dispatch 10 FEEDs to activate queasy; assert `state.vitals` after the 10th FEED matches exactly what 10 pure FEEDs would produce under Phase 3 clamping rules -- no extra delta from queasy activation. Assert `state.state` (if present from Phase 4) is unchanged.

**Midnight sleep-cap:**

- FEED dispatched with `nowMs` corresponding to 00:02 local sets `sleepCapUntil = nowMs + SLEEP_CAP_DURATION_MS`. Assert `sleepCapUntil` is set AND `state.vitals` matches exactly what a regular FEED produces at that moment (stat-unchanged invariant).
- FEED dispatched at 00:05 local does NOT set `sleepCapUntil` (boundary: `minuteOf < SLEEP_CAP_WINDOW_MINUTES` is exclusive at 5).
- PLAY, REST, HEAL dispatched at 00:02 each set `sleepCapUntil`.
- Any action dispatched at 01:00 does not set `sleepCapUntil`.

**Konami (reducer has no involvement):**

- Dispatch the full Konami key sequence via `KonamiListener`; assert no reducer state changed at all (no `feedStreak` change, no `queasyUntil` change, no `sleepCapUntil` change, no vitals change). This is the prose-to-test invariant for "Konami is animation-only."

  2.2. Update `src/game/reducer.ts`:

- FEED branch: compute `feedStreak` update (gap check, increment, queasy activation). Apply midnight check. Apply existing stat deltas. Order: streak logic first, then midnight check, then stat deltas.
- PLAY/REST/HEAL branches: reset `feedStreak.count` to 0. Apply midnight check. Apply existing stat deltas.
- Add two pure helper functions at the top of the file (not exported): `hourOf(ms: number): number` and `minuteOf(ms: number): number`. Both use `new Date(ms).getHours()` / `.getMinutes()`. These are the only places in `src/game/` that construct a `Date` from a number; they never call `Date.now()`.

  2.3. Run `pnpm test` -- reducer tests go green. All Phase 3-5 assertions remain green.

---

## 3. Inject `getNow` into `TamagotchiProvider` and update dispatch sites

3.1. In `src/hooks/useTamagotchi.tsx`:

- Add `getNow?: () => Date` to `TamagotchiProviderProps`. Default: `() => new Date()`.
- Store `getNow` in a ref so it is stable across renders.
- Export a `useDispatchWithNow()` helper (or extend the existing context value) that wraps `dispatch` and injects `nowMs: getNow().getTime()` into FEED, PLAY, REST, HEAL before forwarding to the reducer.

  3.2. Update `FeedButton.tsx`, `PlayButton.tsx`, `RestButton.tsx`, `HealButton.tsx` to call `useDispatchWithNow()` instead of raw `dispatch`. Each button no longer constructs `nowMs` itself.

  3.3. Run `pnpm typecheck` -- all action call sites now pass `nowMs` correctly.

---

## 4. Personality hash variant

4.1. In `src/game/util.ts`, add and export:

```ts
export function djb2(str: string): number { ... }
export function petVariant(name: string): 0 | 1 | 2 {
  return (djb2(name) % 3) as 0 | 1 | 2;
}
```

4.2. In `src/styles/pet.module.css`, add:

```css
.pet-variant-0 {
  --pet-tint: #ffd6e0;
}
.pet-variant-1 {
  --pet-tint: #d6f0ff;
}
.pet-variant-2 {
  --pet-tint: #d6ffd6;
}
```

Add a tint overlay `<rect>` inside the SVG (in `Pet.tsx`) that reads `fill="var(--pet-tint)"` at low opacity (e.g., `opacity="0.18"`). The rect sits behind the body ellipses.

4.3. In `Pet.tsx`, compute `const variant = petVariant(state.name)` and apply `styles[`pet-variant-${variant}`]` to the SVG alongside the existing `styles.pet` class.

4.4. Write `tests/game/util.test.ts` (or extend the existing util test):

- **Determinism test (silent-break guard):** call `petVariant` with the same name 50 times; assert all results are identical. This catches anyone who seeds variants via `Math.random()`.
- Assert `petVariant('Blob') === petVariant('Blob')` and the result is in `{0, 1, 2}`.
- Assert three distinct names produce results covering at least two distinct variants (distribution sanity check, not a strict coverage requirement).

  4.5. Write `tests/components/Pet.test.tsx` (or extend it):

- **Linkage test:** render `<Pet />` inside a provider with `state.name = 'Blob'`; assert the SVG element has a class matching `/pet-variant-[012]/`. This catches anyone who removes the variant class application.

---

## 5. Reaction animations

5.1. In `src/styles/pet.module.css`, add keyframes:

```css
@keyframes chomp {
  /* jaw-drop and snap, 0.6 s */
}
@keyframes hop {
  /* vertical bounce, 0.6 s */
}
@keyframes sparkle {
  /* scale pulse + opacity, 1.2 s */
}
```

The `Zz` overlay is not a keyframe on the pet SVG; it is a separate `<span>` that appears while `isResting` and fades at its edges via a CSS mask or opacity gradient.

5.2. In `pet.module.css`, add attribute selectors:

```css
[data-reaction='chomp'] {
  animation: chomp 0.6s ease-out forwards;
}
[data-reaction='hop'] {
  animation: hop 0.6s ease-out forwards;
}
[data-reaction='sparkle'] {
  animation: sparkle 1.2s ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  [data-reaction] {
    animation-duration: 0s;
  }
}
```

5.3. In `Pet.tsx`:

- Add a `data-reaction` attribute to the SVG, driven by a local `reaction` state string.
- On each action dispatch (FEED, PLAY, REST, HEAL), set `reaction` to the corresponding value (`'chomp'`, `'hop'`, `'Zz'`, `'sparkle'`).
- Attach an `onAnimationEnd` handler to the SVG that clears `reaction` to `''`.
- For REST/HEAL: `Zz` stays while `isResting` is true; clear it when `isResting` becomes false.

  5.4. Write `tests/components/Pet.test.tsx` reaction tests:

- **Linkage test:** dispatch FEED; assert `data-reaction="chomp"` is present on the SVG immediately after dispatch.
- **Stale-reaction test (silent-break guard):** dispatch FEED; fire `animationend` on the SVG; assert `data-reaction` attribute is removed (or empty). This catches anyone who skips the `animationend` cleanup.
- Repeat linkage tests for PLAY (`hop`), HEAL (`sparkle`).
- **Reduced-motion test:** render with a fake `matchMedia` returning `prefers-reduced-motion: reduce`; dispatch FEED; assert `data-reaction="chomp"` is present (attribute still set for testability).

---

## 6. Idle mini-animations

6.1. In `pet.module.css`, add keyframes:

```css
@keyframes yawn {
  /* mouth-open stretch, 2 s */
}
@keyframes blink {
  /* eye-close and open, 2 s */
}
@keyframes look-around {
  /* slight horizontal sway, 2 s */
}
```

Add attribute selectors:

```css
[data-idle-animation='yawn'] {
  animation: yawn 2s ease-in-out;
}
[data-idle-animation='blink'] {
  animation: blink 2s ease-in-out;
}
[data-idle-animation='look-around'] {
  animation: look-around 2s ease-in-out;
}
```

No `prefers-reduced-motion` block needed here because the JS side never sets the attribute under reduce.

6.2. In `Pet.tsx`:

- Add a `useEffect` that sets up a `setInterval` at 1 000 ms.
- Each tick: check `window.matchMedia('(prefers-reduced-motion: reduce)').matches`. If true, do nothing.
- Otherwise: roll `Math.random() < 0.05`. If true, pick one of `['yawn', 'blink', 'look-around']` at random and set `data-idle-animation` on the SVG.
- After 2 000 ms, clear `data-idle-animation` (use a `setTimeout` inside the tick handler; cancel it on the next tick if a new animation fires).
- Clean up both `setInterval` and any pending `setTimeout` on unmount.

  6.3. Write `tests/components/Pet.test.tsx` idle tests:

- **Reduced-motion test (silent-break guard):** render with fake `matchMedia` returning reduce; advance fake timers 100 ticks (100 seconds); assert `data-idle-animation` attribute never appears on the SVG. This catches anyone who removes the `prefers-reduced-motion` guard.
- **Fire test:** render with fake `matchMedia` returning no-preference; mock `Math.random` to always return 0.01 (below 5% threshold); advance 1 tick; assert `data-idle-animation` is set to one of the three valid values.
- **Clear test:** same setup; advance 2 seconds after the attribute is set; assert `data-idle-animation` is cleared.

---

## 7. Easter egg: FEED_10_QUEASY overlay

7.1. In `Pet.tsx`, add a second `useEffect` that sets up a 1 Hz `setInterval` (the overlay tick, separate from the idle tick):

- Each tick: compare `Date.now()` against `state.queasyUntil`. If `Date.now() < state.queasyUntil`, set `data-egg="queasy"` on the SVG. Otherwise clear it.

  7.2. In `pet.module.css`, add:

```css
@keyframes queasy {
  /* side-to-side wobble */
}
[data-egg='queasy'] {
  animation: queasy 1s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  [data-egg='queasy'] {
    animation: none;
  }
}
```

7.3. Write `tests/components/Pet.test.tsx` queasy tests:

- **Linkage test:** render with `state.queasyUntil = Date.now() + 5_000`; advance 1 tick; assert `data-egg="queasy"` is present on the SVG.
- **Expiry test:** render with `state.queasyUntil = Date.now() - 1`; advance 1 tick; assert `data-egg` is absent.
- **Stat-unchanged invariant (prose-to-test):** already covered in step 2.1 at the reducer level.

---

## 8. Easter egg: MIDNIGHT_SLEEP_CAP overlay

8.1. In `Pet.tsx`, add a `<path data-testid="sleep-cap" aria-hidden="true">` element inside the SVG. Render it only when `state.sleepCapUntil > overlayNow` (where `overlayNow` is updated by the same 1 Hz overlay tick from step 7.1).

8.2. No CSS animation on the sleep-cap path. It appears and disappears by toggling its presence in the JSX.

8.3. Write `tests/components/Pet.test.tsx` sleep-cap tests:

- **Linkage test:** render with `state.sleepCapUntil = Date.now() + 5_000`; advance 1 tick; assert `getByTestId('sleep-cap')` is in the document.
- **Expiry test:** render with `state.sleepCapUntil = Date.now() - 1`; advance 1 tick; assert `queryByTestId('sleep-cap')` is null.

---

## 9. Easter egg: KONAMI_CONFETTI

9.1. Create `src/components/KonamiListener.tsx`:

- Local state: `sequence: string[]` tracking the current progress through the expected sequence.
- Expected sequence constant (module-level): `['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']`.
- `useEffect` mounts a `keydown` listener on `document.body`. On each key: normalize `key` (lowercase for single characters). If it matches the next expected key, advance the sequence index. If the full sequence is matched, set `active = true` and reset the index. If the key does not match, reset the index to 0 (or to 1 if the key matches the first expected key).
- When `active`, render `<div data-testid="konami-confetti" aria-hidden="true" className={styles.confetti}>`. After `CONFETTI_DURATION_MS`, set `active = false`.
- Under `prefers-reduced-motion: reduce`, render `<span data-testid="konami-confetti" aria-hidden="true">*</span>` for 300 ms instead.
- Clean up the `keydown` listener on unmount.

  9.2. In `pet.module.css` (or a new `konami.module.css` -- use `pet.module.css` to avoid a new file):

```css
@keyframes confetti-fall {
  /* multi-color particle burst, 3 s */
}
.confetti {
  animation: confetti-fall 3s ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  .confetti {
    animation: none;
  }
}
```

9.3. Render `<KonamiListener />` once in `src/app/page.tsx`.

9.4. Write `tests/components/KonamiListener.test.tsx`:

- **Sequence test:** fire the full 10-key sequence via `fireEvent.keyDown(document.body, { key: ... })`; assert `getByTestId('konami-confetti')` appears.
- **Partial-sequence test:** fire 9 keys; assert `queryByTestId('konami-confetti')` is null.
- **Expiry test:** fire the full sequence; advance `CONFETTI_DURATION_MS`; assert `queryByTestId('konami-confetti')` is null.
- **Reduced-motion test:** fake `matchMedia` returning reduce; fire the full sequence; assert `getByTestId('konami-confetti')` contains the text `*` (static flash, not animated).
- **No-reducer-change invariant (prose-to-test):** fire the full sequence; assert the `TamagotchiProvider` state is identical before and after (no vitals change, no `feedStreak` change, no `queasyUntil` change, no `sleepCapUntil` change).
- **Listener cleanup test (silent-break guard):** unmount `KonamiListener`; fire the full sequence; assert `queryByTestId('konami-confetti')` is null. This catches anyone who drops the `removeEventListener` cleanup.

---

## 10. Full green-bar verification

10.1. Run: `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build`. All exit 0.

10.2. Confirm new tests added: reducer Phase 6 branches, `util.test.ts` hash determinism, `Pet.test.tsx` reaction/idle/queasy/sleep-cap linkage, `KonamiListener.test.tsx`. Total test count rises by at least 20 vs Phase 5.

10.3. Update `CHANGELOG.md` with Phase 6 bullets before merging.

10.4. Suggested commit breakdown:

- `feat(phase-6): extend action shapes and PetModel with streak/egg fields`
- `feat(phase-6): extend reducer with feedStreak, queasyUntil, sleepCapUntil`
- `feat(phase-6): inject getNow into TamagotchiProvider; update dispatch sites`
- `feat(phase-6): add djb2 hash and petVariant util; apply variant class to Pet`
- `feat(phase-6): add reaction animations (chomp/hop/Zz/sparkle) to Pet`
- `feat(phase-6): add idle mini-animations (yawn/blink/look-around) to Pet`
- `feat(phase-6): add queasy and sleep-cap overlay rendering to Pet`
- `feat(phase-6): add KonamiListener component with confetti overlay`
- `test(phase-6): add all Phase 6 tests (reducer, util, Pet, KonamiListener)`
- `docs(phase-6): record phase 6 in changelog`
