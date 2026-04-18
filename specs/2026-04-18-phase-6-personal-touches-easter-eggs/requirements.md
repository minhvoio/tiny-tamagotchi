# Phase 6 -- Personal Touches and Easter Eggs: Requirements

## Scope

Phase 6 gives the pet personality. Every feature in this phase is expressed through CSS animations and DOM attribute changes only. Nothing here touches stats, the state machine, `hasEvolved`, or any persistence key. The pet's vitals and lifecycle remain fully governed by the Phase 3-5 reducer; Phase 6 layers purely decorative behavior on top.

Phase 6 assumes Phase 5 is merged. `state.name` is available in the reducer. The `TamagotchiProvider` accepts a `getNow: () => Date` prop (defaulting to `() => new Date()`). All time-sensitive features inject time through that prop; no component or reducer calls `Date.now()` or `new Date()` directly.

### In Scope

| Area | What ships |
| ---- | ---------- |
| **Idle mini-animations** | Three variants: `yawn`, `blink`, `look-around`. A 1 Hz `setInterval` in `Pet.tsx` rolls a 5% chance each tick to play one variant (uniform random). The chosen variant is written to `data-idle-animation` on the pet SVG for 2 seconds, then cleared. Disabled entirely under `prefers-reduced-motion: reduce`. |
| **Reaction animations** | Four variants keyed to actions: `FEED` triggers `chomp` (0.6 s), `PLAY` triggers `hop` (0.6 s), `REST` triggers `Zz` overlay (present while `isResting`, fades at edges), `HEAL` triggers `sparkle` (1.2 s). The component sets `data-reaction` on the pet SVG when the action is dispatched and clears it on `animationend`. All CSS keyframes in `pet.module.css`. |
| **Easter egg: FEED_10_QUEASY** | Pressing Feed 10 times in a row within 30 seconds (no other awake action in between) triggers a `queasy` animation overlay for 60 seconds. Animation only -- no stat change, no state change. Reducer tracks `feedStreak: { count: number; lastFeedAt: number }`. Each `FEED` action now carries `{ type: 'FEED'; nowMs: number }`. Each non-FEED awake action (`PLAY`, `REST`, `HEAL`) resets `feedStreak.count` to 0. If `nowMs - lastFeedAt > EGG_MAX_STREAK_WINDOW_MS` on a new FEED, count resets to 1. When `feedStreak.count` reaches 10, reducer sets `queasyUntil = nowMs + QUEASY_DURATION_MS`. Pet renders `data-egg="queasy"` while a 1 Hz overlay tick finds `nowMs < queasyUntil`. |
| **Easter egg: KONAMI_CONFETTI** | A new `<KonamiListener />` component mounts a `keydown` listener on `document.body`. The expected sequence is: `ArrowUp`, `ArrowUp`, `ArrowDown`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `ArrowLeft`, `ArrowRight`, `b`, `a` (case-insensitive for `b`/`a`). A full match renders a `<div data-testid="konami-confetti">` overlay for `CONFETTI_DURATION_MS` (3 000 ms) using CSS-only keyframe confetti. Under `prefers-reduced-motion: reduce`, the overlay renders a static `span` containing `*` for 300 ms instead of the animated burst. |
| **Easter egg: MIDNIGHT_SLEEP_CAP** | On any `FEED`, `PLAY`, `REST`, or `HEAL` action, the reducer checks whether `hourOf(action.nowMs) === 0 && minuteOf(action.nowMs) < SLEEP_CAP_WINDOW_MINUTES`. If true, it sets `sleepCapUntil = action.nowMs + SLEEP_CAP_DURATION_MS`. Pet renders a `<path data-testid="sleep-cap" aria-hidden="true">` SVG overlay while `sleepCapUntil` is in the future. The overlay is a decorative nightcap shape; it does not animate (it is structural, not motion-based). |
| **Personality hash variant** | `djb2(state.name) % 3` produces an integer in `{0, 1, 2}`. The pet SVG receives the class `pet-variant-0`, `pet-variant-1`, or `pet-variant-2`. Each variant class sets a single CSS custom property (`--pet-tint`) to a distinct pastel value. The tint is applied as a low-opacity overlay layer inside the SVG, separate from the body fill. Vitals, state, and evolved visuals are unaffected. The hash is computed once in the component from `state.name` and is stable across re-renders for the same name. |
| **Reduced-motion handling** | Under `prefers-reduced-motion: reduce`: idle mini-animations never fire (the 5% roll is skipped entirely); reaction animations still set `data-reaction` for testability but the CSS block zeroes `animation-duration`; confetti collapses to the 300 ms static flash; queasy and sleep-cap overlays still appear (structural, no motion). |
| **Constants** | `src/game/constants.ts` gains: `EGG_MAX_STREAK_WINDOW_MS = 30_000`, `QUEASY_DURATION_MS = 60_000`, `SLEEP_CAP_WINDOW_MINUTES = 5`, `SLEEP_CAP_DURATION_MS = 10_000`, `CONFETTI_DURATION_MS = 3_000`. All exported. |
| **Action type extension** | `FEED` action shape changes to `{ type: 'FEED'; nowMs: number }`. `PLAY`, `REST`, `HEAL` also carry `nowMs: number` (needed for midnight check and streak reset). `TICK` already carries `elapsedMs`; it does not gain `nowMs`. The `TamagotchiProvider` injects `getNow().getTime()` when dispatching any of these four actions. |
| **Reducer state extension** | `PetModel` gains: `feedStreak: { count: number; lastFeedAt: number }`, `queasyUntil: number` (epoch ms, 0 when inactive), `sleepCapUntil: number` (epoch ms, 0 when inactive). Initial values: `feedStreak: { count: 0, lastFeedAt: 0 }`, `queasyUntil: 0`, `sleepCapUntil: 0`. |
| **KonamiListener component** | `src/components/KonamiListener.tsx`. Mounts on the page root. Manages its own local state for sequence progress. Cleans up the `keydown` listener on unmount. |
| **Tests** | All features tested per the Validation spec. |

### Out of Scope (explicitly deferred)

- Sound effects (Phase 7).
- Additional easter eggs beyond the three named above.
- Mobile-specific polish or responsive layout pass (Phase 7).
- Any gameplay modifier: no stat bonus, no state shortcut, no evolution trigger tied to any Phase 6 feature.
- Framer Motion or any new npm dependency.
- New routes beyond `/`.
- Admin or debug UI surfaces.

### Non-negotiables (Scope Contract from `mission.md`)

- All Phase 6 features are animation-only. No stat change, no state-machine change, no persistence key change.
- No mini-games of any kind.
- No notifications.
- No permadeath.
- `prefers-reduced-motion: reduce` is respected for every motion feature.

## Decisions

| Decision | Choice | Why |
| -------- | ------ | --- |
| Idle poll mechanism | `useEffect` + `setInterval` at 1 Hz inside `Pet.tsx`, separate from the main `useTick` loop | Keeps egg overlay timing independent of game-logic tick rate. The game tick interval is tunable; the idle/overlay poll is always 1 Hz. |
| Idle random selection | `Math.floor(Math.random() * 3)` at poll time, guarded by the 5% roll | Uniform distribution across three variants. No seed needed; idle animations are decorative, not deterministic. |
| Reaction clear mechanism | `animationend` event on the pet SVG clears `data-reaction` | Ties cleanup to the actual CSS animation completing, not to a fixed timeout. Avoids stale attributes if animation duration changes. |
| FEED action shape | `{ type: 'FEED'; nowMs: number }` | Keeps the reducer pure. The component injects wall-clock time; the reducer never calls `Date.now()`. Mirrors the Phase 5 TICK pattern. |
| PLAY/REST/HEAL action shape | Each gains `nowMs: number` | Midnight check and streak reset both need the current time. Same pattern as FEED for consistency. |
| feedStreak storage | Inside the reducer state as `feedStreak: { count: number; lastFeedAt: number }` | Pure reducer; no side-effect storage. Streak resets on any non-FEED awake action or on a gap exceeding `EGG_MAX_STREAK_WINDOW_MS`. |
| Queasy/sleep-cap activation check | 1 Hz overlay `setInterval` in `Pet.tsx` compares `Date.now()` against `queasyUntil`/`sleepCapUntil` | The overlay tick is UI-only and does not dispatch to the reducer. It reads reducer state and sets a local `isQueasy`/`isSleepCap` boolean for rendering. |
| Personality hash algorithm | djb2 hash of `state.name`, result modulo 3 | Deterministic, dependency-free, fast. Same name always produces the same variant. |
| Variant application | CSS class `pet-variant-{0..2}` on the SVG element, setting `--pet-tint` | Keeps variant purely in CSS. The SVG body fill and state-driven classes from Phase 4 are unaffected. |
| KonamiListener placement | Rendered once in `src/app/page.tsx` alongside `<TamagotchiProvider>` | Single listener, no prop drilling. Manages its own sequence state locally. |
| Confetti reduced-motion fallback | Static `span` containing `*` for 300 ms | Provides feedback without motion. The `data-testid="konami-confetti"` attribute still appears, keeping tests uniform. |
| Sleep-cap overlay | `<path>` element inside the pet SVG, `aria-hidden="true"` | Decorative only. Screen readers ignore it. No motion; it appears and disappears by toggling presence in the DOM. |
| No new npm dependencies | All animations are CSS keyframes; no Framer Motion | Tech-stack rule: Framer Motion is allowed only if a specific need arises. CSS keyframes are sufficient here. |

## Context

### Tone and conventions

- No new user-facing copy beyond what is listed in the Validation tone check.
- `aria-hidden="true"` on all decorative overlay elements.
- `data-*` attributes are the contract between the reducer/component and the test suite. Never remove them.
- Comments in CSS only where they name the animation variant and its trigger condition.

### Stack pointers (see `specs/tech-stack.md`)

- Next.js 14+, React 18+, TypeScript strict.
- Tailwind CSS for layout; CSS Modules (`pet.module.css`) for all new keyframes and variant classes.
- Vitest + React Testing Library + jsdom.
- No new dependencies.

### Existing patterns to follow

- **Pure game logic, impure UI** -- all new reducer fields live in `src/game/`. The component reads state and sets DOM attributes; it never mutates state directly.
- **One source of truth** -- `TamagotchiProvider` owns `getNow` injection and dispatches `nowMs` on every action.
- **data-state pattern from Phase 4** -- Phase 6 extends this with `data-egg`, `data-reaction`, and `data-idle-animation` attributes on the pet SVG.
- **StateAnnouncer pattern from Phase 4** -- `KonamiListener` follows the same mount/unmount cleanup discipline.
- **Scope Contract is law** -- no stat change, no state-machine change, no new routes.

### Existing file layout (post Phase 5 merged)

- `src/game/` has `state.ts`, `reducer.ts`, `constants.ts`, `util.ts`.
- `src/hooks/` has `useTick.ts`, `useTamagotchi.tsx`.
- `src/components/` has `Pet.tsx`, `PetStage.tsx`, `StatBar.tsx`, `ActionButton.tsx`, `FeedButton.tsx`, `PlayButton.tsx`, `RestButton.tsx`, `HealButton.tsx`.
- `src/styles/` has `pet.module.css`.
- `tests/game/` has `reducer.test.ts`. `tests/hooks/` has hook tests. `tests/components/` has component tests.

### Open Questions

None. All decisions above are resolved. Numeric tuning constants are exported from `constants.ts` and can be adjusted without touching logic.
