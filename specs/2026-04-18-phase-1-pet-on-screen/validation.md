# Phase 1 — A Pet on Screen: Validation

## Automated

Run from `tiny-tamagotchi/`. Every command must exit with code 0.

| Command             | Must produce                                                            |
| ------------------- | ----------------------------------------------------------------------- |
| `pnpm lint`         | Zero errors, zero warnings.                                             |
| `pnpm typecheck`    | `tsc --noEmit` passes.                                                  |
| `pnpm format:check` | Prettier reports all files formatted.                                   |
| `pnpm test`         | 3 tests pass (smoke + `Pet` + `PetStage`); zero failures, zero skipped. |
| `pnpm build`        | Next.js production build succeeds; `/` remains a static route.          |

### Specific assertions

- `src/components/Pet.tsx` exports a default or named `Pet` component that accepts no props and renders an `<svg>` with `role="img"` and `aria-label="Tiny tamagotchi, idling"`.
- `<Pet />`'s root SVG carries the `pet` class from `src/styles/pet.module.css` (regex-matched as `/pet/` to tolerate CSS Modules hashing). This binds the component to its animation source; without it, the bob animation could silently detach.
- `src/components/PetStage.tsx` exports a component accepting only `children` and rendering them inside a single wrapping `div`.
- `src/styles/pet.module.css` contains exactly one `@keyframes bob` rule and one `@media (prefers-reduced-motion: reduce)` block disabling the animation.
- `src/app/page.tsx` imports `Pet` and `PetStage` from `@/components/*` and renders them inside `<main>` beneath the existing `<h1>`.
- No new runtime dependencies added to `package.json` (diff shows only dev-time config/source changes).
- No use of `framer-motion`, `gsap`, or other animation libraries.
- No `"use client"` directive added unless strictly needed (Pet and PetStage are presentational; they should not require it in Phase 1).
- No game/state logic added; `src/game/` and `src/hooks/` remain empty (still only `.gitkeep`).

## Manual

### Walkthrough

1. From `tiny-tamagotchi/`, run `pnpm dev`, open `http://localhost:3000`.
2. Confirm the page layout, top to bottom:
   - Centered heading "Tiny Tamagotchi".
   - Below it, a centered stage with a small pastel floor strip.
   - On the stage, a pixel-ish creature (body + two eyes + mouth) gently bobbing up and down.
3. Resize the window: the pet stays centered on the stage; edges stay crisp (no blurry SVG scaling).
4. Stop dev; run `pnpm build && pnpm start`; same result on the production server.

### Behavior

- Page loads with zero console errors or warnings (React, Next.js, Tailwind, DevTools accessibility audit).
- No network requests beyond Next.js runtime + Tailwind CSS.
- The bob animation loops smoothly, no jitter.

### Accessibility & reduced-motion

- In devtools accessibility tree, `<Pet />` shows as `img "Tiny tamagotchi, idling"`.
- Enable **Emulate CSS media feature `prefers-reduced-motion: reduce`** in devtools → reload. The pet is visible and still looks like a creature, but the bob animation is **off** (no transform changes over time).
- Keyboard navigation: pressing Tab does not focus the pet (it is presentational, not interactive).

### Edge cases

- `pnpm test` on a cold cache still passes.
- Fresh install (`rm -rf node_modules .next && pnpm install && pnpm build`) reproduces the green bar.
- Viewing `/` in Safari and Firefox shows the same layout and animation as Chrome.

### Browser verification (webapp-testing skill)

Run **after** the automated tests pass and **before** merging. `tsc --noEmit` and Vitest prove types + component rendering in jsdom, but they don't exercise the actual browser rendering path (real CSS, real compositor, real prefers-reduced-motion). The `webapp-testing` skill closes that gap.

Load the skill and run `scripts/with_server.py` with `pnpm dev` on port 3000, then execute a Playwright script that performs:

1. **Baseline capture**: navigate to `http://localhost:3000`, `wait_for_load_state('networkidle')`, screenshot to `/tmp/phase-1-after.png`.
2. **DOM assertions** (reconnaissance-then-action pattern):
   - `page.get_by_role('img', name=re.compile(r'tiny tamagotchi, idling', re.I))` resolves to exactly one element.
   - The resolved element's `class` attribute contains a token matching `/pet/` (CSS Module hash-tolerant).
   - `page.get_by_role('heading', level=1)` has text `"Tiny Tamagotchi"`.
3. **Animation evidence**: capture two screenshots 1s apart of the `<Pet />` bounding box; assert the image hashes differ (bob animation is running).
4. **Reduced-motion regression**: re-launch a new context with `reduced_motion='reduce'`, take two screenshots 1s apart of the same bounding box; assert the image hashes are identical (animation paused).
5. **Console audit**: collect `page.on('console', ...)` and `page.on('pageerror', ...)`; assert zero errors and zero warnings during the run.

A passing run of this script is the gate for merging Phase 1. Store the baseline screenshot alongside the PR so later phases have a visual reference.

## Tone check

The only copy introduced in Phase 1 is the `aria-label` value: **"Tiny tamagotchi, idling"**. Verify:

- Exact spelling, lowercase "tamagotchi" inside the label, comma before "idling".
- No marketing voice, no emoji, no exclamation.
- Page-visible text remains just the existing "Tiny Tamagotchi" title — no subtitle, no pet name, no instructions.

## Scope Contract check

Confirm Phase 1 introduced **nothing** from the 🚫 list in `mission.md`:

- No auth, users, accounts, multi-user data.
- No multiple-pet structures, inventories, currencies.
- No notifications APIs, mini-games, social/sharing.
- No admin routes or debug UI.
- No permadeath or lifecycle logic.
- No stat logic, reducers, or persistence (reserved for Phases 2 and 5).

If any of the above appears in the diff, **fail** validation and remove it.

## Definition of Done

Phase 1 is complete when **all** of the following are true:

- [ ] Branch `phase-1-pet-on-screen` contains only the commits required for Phase 1.
- [ ] Every command in the **Automated** table exits 0 on a fresh clone.
- [ ] Every **Specific assertion** holds true.
- [ ] The **Manual walkthrough** matches exactly, including reduced-motion behavior.
- [ ] **Tone check** passes.
- [ ] **Scope Contract check** passes.
- [ ] **Browser verification via `webapp-testing` skill** ran clean: DOM assertions, animation evidence, reduced-motion regression, and zero console errors/warnings.
- [ ] `CHANGELOG.md` has new bullets under today's date summarizing Phase 1 deliverables.
- [ ] No TODO/FIXME comments left in the diff.
- [ ] `specs/roadmap.md` Phase 1 deliverables can honestly be ticked.
