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
