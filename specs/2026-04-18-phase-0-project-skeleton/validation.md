# Phase 0 — Project Skeleton: Validation

## Automated

Run from `tiny-tamagotchi/`. Every command must exit with code 0.

| Command | Must produce |
|---|---|
| `pnpm install` | Clean install; `pnpm-lock.yaml` present and committed. |
| `pnpm lint` | Zero ESLint errors, zero warnings. |
| `pnpm typecheck` | `tsc --noEmit` passes with `strict: true`. |
| `pnpm format:check` | Prettier reports all files formatted. |
| `pnpm test` | Smoke test `tests/smoke.test.ts` passes; exactly one test file runs; zero failures, zero skipped. |
| `pnpm build` | Next.js production build succeeds; `.next/` is produced. |

### Specific assertions

- `tsconfig.json` contains `"strict": true` and the `@/*` alias.
- `package.json` scripts block matches the exact set listed in `plan.md` §7.2.
- `vitest.config.ts` uses `environment: 'jsdom'` and includes `tests/**/*.test.{ts,tsx}`.
- `src/app/page.tsx` renders only an `<h1>` with the text `Tiny Tamagotchi` inside a single `<main>` — no other visible content, no components imported from `src/components/` or `src/game/`.
- `src/components/`, `src/game/`, `src/hooks/`, `src/styles/`, `public/sprites/` all exist, each containing only a `.gitkeep`.
- No dependency on Zustand, Redux, Framer Motion, Storybook, Husky, or lint-staged in `package.json`.
- No source file imports from `src/game/` or `src/hooks/` yet (they are reserved for Phase 2).

## Manual

### Walkthrough
1. Clone the repo fresh (or delete `node_modules/` and `.next/`).
2. From `tiny-tamagotchi/`, run `pnpm install`.
3. Run `pnpm dev`; open `http://localhost:3000`.
4. Confirm: a single centered "Tiny Tamagotchi" heading on an otherwise empty page. No pet, no buttons, no stat bars, no navigation.
5. View page source / devtools: `<title>` is `Tiny Tamagotchi`, `<meta name="description">` is present.
6. Stop the dev server. Run `pnpm build && pnpm start`; verify the production build serves the same page.

### Behavior
- The page loads without console errors or warnings (React, Next.js, or Tailwind).
- No network requests beyond the Next.js runtime bundle and Tailwind styles.
- Resizing the window keeps the title centered (basic Tailwind flex behavior).

### Edge cases
- `pnpm test` when run from a cold cache still passes.
- Deleting `node_modules/` and re-running `pnpm install && pnpm test && pnpm build` reproduces the green bar.

## Tone check

The only user-facing copy is the app title: **"Tiny Tamagotchi"**. Verify:
- Exact spelling, capital T-T.
- No subtitle, tagline, or filler text.
- No emoji, exclamation marks, or marketing voice.

## Scope Contract check

Confirm Phase 0 introduced **nothing** on the 🚫 list from `mission.md`:
- No auth, users, or accounts.
- No multiple-pet structures, inventories, currencies.
- No notification APIs, mini-games, social/sharing.
- No admin routes or debug UI.
- No permadeath or lifecycle logic.

If any of the above appears in the diff, **fail** validation and remove it.

## Definition of Done

Phase 0 is complete when **all** of the following are true:

- [ ] Branch `phase-0-project-skeleton` exists with all scaffold commits.
- [ ] Every command in the **Automated** table exits 0 on a fresh clone.
- [ ] Every **Specific assertion** is true.
- [ ] The **Manual walkthrough** produces the exact page described.
- [ ] **Tone check** passes — no unexpected copy.
- [ ] **Scope Contract check** passes — no forbidden surface area introduced.
- [ ] `tiny-tamagotchi/README.md` documents install + the five core scripts.
- [ ] No dependencies outside the list in `requirements.md` §Decisions.
- [ ] No TODO/FIXME comments left in the diff.
- [ ] `specs/roadmap.md` Phase 0 checklist items can honestly be ticked.
