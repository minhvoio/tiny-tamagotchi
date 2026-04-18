# Changelog

## 2026-04-18

- Initial project scaffold: repo init, README, and `.gitignore`
- Add constitution in `specs/`: `mission.md`, `tech-stack.md`, `roadmap.md`
- Add Phase 0 spec folder `specs/2026-04-18-phase-0-project-skeleton/` with `requirements.md`, `plan.md`, `validation.md`
- Bootstrap Next.js 16 + React 19 + Tailwind v4 app (App Router, `src/`, `@/*` alias); minimal landing page with centered "Tiny Tamagotchi" title
- Enable TypeScript `noUncheckedIndexedAccess` on top of `strict`
- Configure Prettier with `eslint-config-prettier` harmony; add `format` / `format:check` / `typecheck` / `test` scripts
- Wire up Vitest + React Testing Library + jsdom with one smoke test
- Scaffold `src/{components,game,hooks,styles}` and `public/sprites` with `.gitkeep` for future phases
- Phase 1 (Pet on Screen): inline-SVG `<Pet />` pixel creature with `role="img"` + `aria-label="Tiny tamagotchi, idling"`
- Phase 1: `src/styles/pet.module.css` defines the `bob` keyframe, applies `image-rendering: pixelated`, and disables motion under `prefers-reduced-motion: reduce`
- Phase 1: `<PetStage />` wrapper with pastel floor strip, mounted on `/` beneath the heading
- Phase 1: RTL tests — `<Pet />` renders with the idling aria-label and the `pet` CSS Module class (hash-tolerant regex); `<PetStage />` renders its children
- Phase 1: browser verification script `tests/browser/phase1_verify.py` via the `webapp-testing` skill — baseline screenshot, DOM assertions, bob-animation frame diff, reduced-motion regression, and console audit (all zero)
- Phase 2 (Hunger Vital): pure game core under `src/game/` — `constants.ts` (MAX_STAT=100, MIN_STAT=0, TICK_INTERVAL_MS=3000, DECAY_PER_TICK=1, FEED_AMOUNT=20), `state.ts` (Stat, Vitals, PetModel, Action union FEED|TICK co-located), `util.ts` (`clamp`), `reducer.ts` (pure, integer-only, clamped to [0,100], FEED and TICK with elapsedMs)
- Phase 2: `src/hooks/useTick.ts` (setInterval-driven TICK dispatch with cleanup); `src/hooks/useTamagotchi.tsx` — `"use client"` Provider owning `useReducer` + `useTick` plus a context hook that throws outside the provider
- Phase 2: `<StatBar />` — `role="progressbar"` with live `aria-valuenow`/`aria-valuemin`/`aria-valuemax`/`aria-label` plus a numeric `value / max` readout; `<FeedButton />` (`"use client"`) — dispatches FEED, disabled at MAX_STAT
- Phase 2: home page wraps its content in `<TamagotchiProvider>` and renders Hunger bar + Feed button beneath the pet stage
- Phase 2: vitest coverage — reducer, useTick (fake timers + cleanup), TamagotchiProvider/useTamagotchi (state updates + error outside provider), StatBar (ARIA + clamp), FeedButton (disabled at MAX_STAT, dispatch delta, re-disables on clamp) — 27 total tests passing
- Phase 2: browser verification `tests/browser/phase2_verify.py` via webapp-testing — initial state (100/100 + disabled Feed), decay over ~2 ticks, feed delta = FEED_AMOUNT, clamp boundary (spam Feed → stays at 100), long-idle floor (hunger reaches 0 and holds, no permadeath), console audit (zero errors/warnings/pageerrors)
- Phase 3 (Full Care Loop): extend `Vitals` to `{ hunger, happiness, energy }` and add `isResting: boolean` to `PetModel`; grow `Action` union with `PLAY` and `REST` (still co-located in `state.ts`, no `HEAL`/`RESET` yet)
- Phase 3: `src/game/constants.ts` adds `CARE_AMOUNTS` (`feed: { hunger: 20, happiness: 5 }`, `play: { happiness: 20, energy: -15 }`), `PLAY_MIN_ENERGY=10`, `REST_RECOVERY_PER_TICK=10`; removes the now-redundant `FEED_AMOUNT`
- Phase 3: reducer gains `FEED`/`PLAY`/`REST`/`TICK` branches with `isResting` gates (Feed/Play no-op while resting, Play also no-op below `PLAY_MIN_ENERGY`), per-tick vital decay while awake, energy recovery while resting, and **atomic auto-wake** — a single `TICK` that brings energy to 100 clears `isResting` in the same returned state object (no second dispatch)
- Phase 3: generic `<ActionButton />` with `aria-disabled` + `title={disabledReason}`; `<FeedButton />` refactored onto it; new `<PlayButton />` and `<RestButton />` (label toggles `Rest`/`Wake`, never disabled)
- Phase 3: home page renders three `<StatBar />`s in fixed order Hunger → Happiness → Energy and a row of Feed/Play/Rest buttons under the pet stage
- Phase 3: vitest coverage grows to 50 tests — full reducer matrix (FEED gated, PLAY gated + clamped, REST toggle, TICK awake/resting, atomic auto-wake assertion on one reducer output), `<ActionButton />` aria/title/click handling, `<PlayButton />`/`<RestButton />` gating and toggling, and a `tests/integration/care-loop.test.tsx` that runs feed → play → rest → auto-wake and Wake mid-recovery without vitals leaving [0, 100]
- Phase 3: browser verification `tests/browser/phase3_verify.py` via webapp-testing — bar ordering (Hunger/Happiness/Energy), button ordering (Feed/Play/Rest), care-loop sequence (decay, feed re-disables with "Pet is full", Play tires to "Too tired to play", Rest flips the label and freezes Hunger/Happiness), **atomic auto-wake** (polls `(buttonLabel, energy)` together across the transition and asserts no frame ever shows `Wake` + energy=100), keyboard Tab reachability of all three buttons, and zero console/page errors
