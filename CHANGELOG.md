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
