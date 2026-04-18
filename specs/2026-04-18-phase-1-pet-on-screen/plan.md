# Phase 1 — A Pet on Screen: Plan

Each group is independently implementable. Complete them in order; the validation file defines "done" per group.

---

## 1. Draw the pet (inline SVG + CSS Module)

1.1. Create `src/styles/pet.module.css` with:

- A short comment block naming the two palette tokens (body, floor).
- A `.pet` class that applies `image-rendering: pixelated` and the bob animation.
- A `@keyframes bob` — 0% `translateY(0)`, 50% `translateY(-2px)`, 100% `translateY(0)`; ease-in-out; `animation: bob 2s ease-in-out infinite;`.
- A `@media (prefers-reduced-motion: reduce)` block that sets `animation: none` on `.pet`.
- A `.stage` class: flex column, items-center, a fixed-height floor strip (`::after`) rendered as a muted pastel bar below the pet.
  1.2. Create `src/components/Pet.tsx`:
- Client component (no `"use client"` directive needed — it's presentational; defer client directive until interactions land).
- Takes zero props.
- Returns an `<svg>` with `role="img"`, `aria-label="Tiny tamagotchi, idling"`, a sensible `viewBox` (e.g., `0 0 64 64`) and `className={styles.pet}`.
- Draws: rounded body, two eyes (small filled circles), a simple mouth (short path or rect). Use `currentColor` or CSS custom properties where possible so Phase 4 can swap palette by wrapping ancestor.
  1.3. Confirm `pnpm typecheck` passes.

## 2. Build the stage wrapper

2.1. Create `src/components/PetStage.tsx`:

- Client component not required (pure layout).
- Props: `children: React.ReactNode`. No other props in Phase 1.
- Returns a `div` with `className={styles.stage}` imported from `pet.module.css`.
- Includes a brief JSDoc comment: "Mount point for the pet and future stat overlays."
  2.2. Confirm the stage renders `children` as-is in a manual render.

## 3. Wire into the home page

3.1. Update `src/app/page.tsx`:

- Keep the centered `<h1>Tiny Tamagotchi</h1>`.
- Below the heading, render `<PetStage><Pet /></PetStage>`.
- Adjust `<main>` to stack title + stage vertically with comfortable spacing (use Tailwind `flex-col gap-12` or similar).
  3.2. Run `pnpm dev` and visually confirm:
- Title at top, pet below, floor strip under the pet.
- Pet bobs gently.
- When the OS is set to reduced motion, the pet is still present but static.

## 4. Tests (Vitest + RTL)

4.1. Create `tests/components/Pet.test.tsx`:

- Render `<Pet />`.
- Assert `screen.getByRole('img', { name: /tiny tamagotchi, idling/i })` is in the document.
  4.2. Create `tests/components/PetStage.test.tsx`:
- Render `<PetStage><span data-testid="child">x</span></PetStage>`.
- Assert the child is in the document (`getByTestId('child')`).
  4.3. Update `vitest.config.ts` only if needed (current `include: ['tests/**/*.test.{ts,tsx}']` already matches).
  4.4. Run `pnpm test` — 3 tests total (smoke + 2 new) pass.

## 5. Accessibility & reduced-motion sanity

5.1. Inspect in devtools that `<Pet />` has `role="img"` and `aria-label`; the inner SVG children are decorative (they do not add their own roles).
5.2. In Chrome devtools rendering panel, toggle "Emulate CSS media feature `prefers-reduced-motion`" → `reduce`. Reload. The pet must stop bobbing; no layout shift.
5.3. Confirm no console warnings from React about accessibility or keys.

## 6. Full green-bar verification

6.1. Run in sequence: `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build`. All exit 0.
6.2. Update `CHANGELOG.md` manually or via the changelog skill before merging (per project convention).
6.3. Commit in small groups (suggested):

- `feat(phase-1): add Pet and PetStage components with CSS-module bob animation`
- `feat(phase-1): mount Pet on home page`
- `test(phase-1): cover Pet and PetStage render with RTL`
- `docs(phase-1): record Phase 1 in changelog`
  6.4. Push branch and open the merge when validation is clean.
