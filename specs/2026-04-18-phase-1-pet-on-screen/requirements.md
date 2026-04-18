# Phase 1 — A Pet on Screen: Requirements

## Scope

Phase 1 adds the first living-looking element: a visible, idle pet under the existing title. The pet is **static** — no stats, no interactions, no states — but it animates to feel alive. This establishes the rendering primitives (inline SVG, CSS Module keyframes, pixel-perfect rendering, accessibility baseline) that every later phase depends on.

### In Scope

| Area                       | What ships                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`<Pet />` component**    | Inline SVG pixel-art creature at `src/components/Pet.tsx`. Body + two eyes + mouth, drawn with simple shapes (circles / rects / paths). Crisp at any size.                                                                                                                                                                                                                |
| **Idle animation**         | One CSS `@keyframes` animation — **gentle vertical bob** — defined in `src/styles/pet.module.css`, applied to `<Pet />` via a stable class name. Loops infinitely.                                                                                                                                                                                                        |
| **`<PetStage />` wrapper** | Simple centered stage that hosts the pet with a subtle pastel floor strip underneath. Located at `src/components/PetStage.tsx`. Phase 1 uses it only for the pet; later phases reuse it as the home for stat overlays.                                                                                                                                                    |
| **Page layout**            | `src/app/page.tsx` now renders: title at top, `<PetStage />` centered below it. Nothing else.                                                                                                                                                                                                                                                                             |
| **Pixel rendering**        | Global rule (or scoped to the pet) applies `image-rendering: pixelated`. Any scaling of the SVG stays crisp.                                                                                                                                                                                                                                                              |
| **Accessibility**          | `<Pet />` has a meaningful `role="img"` and `aria-label` (e.g., `"Tiny tamagotchi, idling"`). `prefers-reduced-motion: reduce` disables the bob animation entirely.                                                                                                                                                                                                       |
| **Tests**                  | React Testing Library test (`tests/components/Pet.test.tsx`) asserts the pet renders with the expected `aria-label` **and** that its root element carries the `pet` CSS Module class (regex-matched to tolerate hashing) — this locks the component to its animation source. A second test (`tests/components/PetStage.test.tsx`) asserts the stage renders its children. |

### Out of Scope (explicitly deferred)

- Any game state, stats, reducer, tick loop (→ Phase 2).
- Feed/Play/Rest/Heal buttons or any interaction (→ Phase 2+).
- Multiple sprites, Sick/Evolved variants, or expression changes (→ Phase 4).
- Sound, haptics, or reactive animations (→ Phase 7 / 6).
- A pet name, naming flow, or personalization (→ Phase 5).
- Persistence (→ Phase 5).
- Easter egg animations or idle variants like blinking / looking-around (→ Phase 6).
- PNG sprite sheets or binary art assets (not in Phase 1; inline SVG only).

### Non-negotiables (Scope Contract from `mission.md`)

- No auth, no user accounts.
- No multiple pets, inventories, currencies.
- No notifications APIs or permission prompts.
- No new routes beyond `/`.
- No admin or debug UI.

## Decisions

| Decision            | Choice                                                                            | Why                                                                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pet art             | **Inline SVG blob** (body + two eyes + mouth)                                     | Crisp at any size, versionable as text, themable via CSS. Matches `tech-stack.md`: "Inline SVG or CSS sprite sheets". Avoids committing binary assets before we need them. |
| Animation technique | **CSS keyframes in a CSS Module** (`src/styles/pet.module.css`)                   | Matches `tech-stack.md`: "CSS Modules where we need keyframes and pixel-precise control." Keeps Tailwind for layout, CSS Modules for motion.                               |
| Animation style     | **Single `bob` keyframe** (~2s ease-in-out, `translateY(0)` ↔ `translateY(-2px)`) | One animation is enough to feel alive; extra variants belong to Phase 6.                                                                                                   |
| Stage structure     | **Introduce `<PetStage />` now**                                                  | Cheap to add; gives later phases (stat overlays, sick icons, evolved shimmer) a stable mount point without refactoring `page.tsx` each phase.                              |
| Pixelation          | **Apply `image-rendering: pixelated` scoped to the stage**                        | Keeps the rest of the app's rendering untouched. Lives in `pet.module.css`.                                                                                                |
| Reduced motion      | **Disable bob via `@media (prefers-reduced-motion: reduce)`**                     | a11y baseline; pixel still visible, just static.                                                                                                                           |
| State library       | **None** (Phase 1 is entirely static)                                             | Per `tech-stack.md`, state library is deferred to Phase 2. `<Pet />` takes zero props in Phase 1.                                                                          |
| New dependencies    | **None**                                                                          | No framer-motion, no animation libs.                                                                                                                                       |
| Testing             | **RTL render + `aria-label` assertion**                                           | Matches the smoke test already in `tests/`. One test per new component, co-located under `tests/components/`.                                                              |

## Context

### Tone & conventions

- **File naming**: React components `PascalCase.tsx`; CSS modules match component `pet.module.css`; tests `ComponentName.test.tsx`.
- **Imports**: absolute via `@/` alias. `import { Pet } from '@/components/Pet';`.
- **Copy**: the only new user-facing string is the `aria-label`: `"Tiny tamagotchi, idling"`. No visible text added; title stays "Tiny Tamagotchi".
- **Comments**: SVG shapes may carry a one-line comment naming the part (`{/* body */}`). No decorative headers.
- **Color palette**: choose two muted pastel tones for body + floor (e.g., `oklch` or hex). Keep it in the CSS Module so Phase 4 can swap a "sick" palette easily. Document the choice at the top of the module.

### Stack pointers (see `specs/tech-stack.md`)

- Next.js 16 App Router, React 19, TypeScript strict + `noUncheckedIndexedAccess`.
- Tailwind CSS v4 via `@import "tailwindcss"` in `globals.css`.
- CSS Modules are the animation home.
- Vitest + React Testing Library + jsdom for component tests; `tests/setup.ts` imports `@testing-library/jest-dom/vitest`.

### Existing patterns to follow

- **Pure logic, impure UI** — Phase 1 adds no logic; it's 100% UI. `<Pet />` is a pure presentational component.
- **Scope Contract is law** — nothing introduced in Phase 1 may conflict with the 🚫 list in `mission.md`.
- **Keep it tiny** — one new keyframe, two new components, two new tests. No config sprawl.

### Existing file layout (post Phase 0)

- `src/app/page.tsx` currently renders a single `<h1>` inside `<main>`.
- `src/components/` and `src/styles/` currently contain only `.gitkeep`.
- `tests/` has `setup.ts` and `smoke.test.ts`; no subfolders yet — Phase 1 introduces `tests/components/`.

### Open questions

- None. Phase 1 is fully specified; palette choice is a designer detail, not a blocker.
