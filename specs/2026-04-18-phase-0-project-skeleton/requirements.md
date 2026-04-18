# Phase 0 — Project Skeleton: Requirements

## Scope

Stand up an empty, runnable Next.js app inside `tiny-tamagotchi/` that proves the toolchain works end-to-end. No game logic, no pet, no stats, no sprites — just a disciplined foundation the later phases can build on.

### In Scope

| Area | What ships |
|---|---|
| **App bootstrap** | `pnpm create next-app` output (TypeScript, App Router, Tailwind, ESLint) living at `tiny-tamagotchi/` root alongside `specs/`. |
| **TypeScript** | `tsconfig.json` with `"strict": true`; Next.js defaults otherwise. |
| **Styling** | Tailwind CSS configured; `content` globs cover `./src/**/*.{ts,tsx}`. Tailwind base styles applied in `src/app/globals.css`. |
| **Linting / Formatting** | ESLint (`next/core-web-vitals` + `next/typescript`) and Prettier installed, with a `.prettierrc` and an ESLint config that doesn't conflict with Prettier. |
| **Testing** | Vitest + `@testing-library/react` + `jsdom` preconfigured. One sample test (`tests/smoke.test.ts`) asserts `1 + 1 === 2` to prove the harness runs. Test file path convention documented. |
| **Folder scaffold** | Empty directories exist matching `tech-stack.md` layout: `src/app/`, `src/components/`, `src/game/`, `src/hooks/`, `src/styles/`, `public/sprites/`, `tests/`. Each created with a `.gitkeep` (no README stubs — keep it tiny). |
| **Root page** | `src/app/page.tsx` renders only the app title ("Tiny Tamagotchi") centered on the page using Tailwind. Nothing else. |
| **Layout** | `src/app/layout.tsx` sets `<title>` and `<meta name="description">`; wraps children with `globals.css` applied. |
| **Scripts** | `package.json` exposes `dev`, `build`, `start`, `lint`, `test`, `typecheck`. |
| **README** | `tiny-tamagotchi/README.md` documents prereqs (Node 18+, pnpm) and the four key commands: `pnpm install`, `pnpm dev`, `pnpm test`, `pnpm build`. |
| **Version control hygiene** | `.gitignore` excludes `node_modules`, `.next`, `coverage`, build artifacts. |

### Out of Scope (explicitly deferred)

- `<Pet />` component, sprites, any placeholder creature visuals (→ Phase 1).
- Any game state, reducer, tick hook, action types (→ Phase 2).
- Storybook, Husky, lint-staged, commitlint, any git hooks.
- Framer Motion, Zustand, or any state/animation library (Zustand revisited in Phase 2 per `tech-stack.md`).
- CI (GitHub Actions) and Vercel deployment (→ Phase 7).
- Favicon, OG image, accessibility pass (→ Phase 7).
- Audio setup (→ Phase 7).

### Non-negotiables (Scope Contract)

Even this foundation honors `mission.md`:

- No auth scaffolding, no user/account types.
- No notification libraries or browser permission prompts.
- No inventory, currency, or admin route stubs.
- No placeholder code implying mini-games, multiple pets, or permadeath.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Package manager | **pnpm** | Matches `tech-stack.md`; fast, strict lockfile. |
| Router | **App Router** (`src/app/`) | Matches `tech-stack.md`; aligns with modern Next.js defaults. |
| TypeScript mode | **strict** | Types enforce the Scope Contract (canonical shapes land in Phase 2). |
| Styling | **Tailwind CSS** only; CSS Modules added later when sprites need them (Phase 1+) | Keep Phase 0 surface minimal. |
| Test runner | **Vitest + jsdom + React Testing Library** | Matches `tech-stack.md`; one smoke test proves the pipeline. RTL installed now so Phase 2 has no setup friction. |
| State library | **None yet** | Per `tech-stack.md`, deferred to Phase 2. No Zustand, no Redux, no Context in Phase 0. |
| Git hooks | **None** | "Keep it tiny" — no Husky, no lint-staged. Scripts exist so a future CI can run them. |
| Folder stubs | **`.gitkeep` only** | No README stubs per user direction; keeps the scaffold clean. |
| App source location | **`src/` directory** | Matches `tech-stack.md` layout exactly. |

## Context

### Tone & conventions
- **File naming**: `kebab-case` for filenames, `PascalCase` for React components, `camelCase` for functions/variables.
- **Imports**: absolute imports via `@/` alias (`baseUrl: "."`, `paths: { "@/*": ["src/*"] }`).
- **Copy**: the only user-facing string in Phase 0 is the title "Tiny Tamagotchi". Neutral, lowercase-free-of-cute-filler. Save personality for Phase 6.
- **Comments**: none required in Phase 0 — the scaffold should be self-evident. If added, full sentences, explaining *why* not *what*.

### Stack pointers (see `specs/tech-stack.md`)
- Next.js 14+, React 18+, TypeScript strict.
- Tailwind CSS; no CSS-in-JS runtime libs.
- Vitest + React Testing Library; no Jest.
- No new dependencies beyond the list above without explicit approval.

### Existing patterns to follow (from the constitution)
- **Pure logic, impure UI** — the folder `src/game/` exists now, empty, awaiting Phase 2's reducer.
- **Pixel-first aesthetic** — reserved for Phase 1; Phase 0 styling is plain Tailwind only.
- **Scope Contract is law** — nothing in Phase 0 may introduce types, routes, or dependencies forbidden by `mission.md`.

### Open questions
- None. Phase 0 is fully specified; any ambiguity resolves to "defer to a later phase."
