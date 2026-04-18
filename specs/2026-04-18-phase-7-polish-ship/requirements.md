# Phase 7 — Polish & Ship: Requirements

## Scope

Phase 7 makes the app production-ready across three pillars: accessibility, responsive layout, and metadata plus deploy infrastructure. No gameplay changes. No audio. The pet's mechanics, state machine, and persistence are frozen from Phase 6.

### In Scope

| Pillar                | What ships                                                                                                                                                                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Accessibility**     | Skip-link to first action button; `button:focus-visible` ring in `globals.css`; `<section aria-label="Pet actions">` wrapping the button row; `<section aria-label="Pet vitals">` wrapping the three StatBars; StateAnnouncer from Phase 4 retained unchanged; axe-core browser scan asserting zero violations.                                  |
| **Responsive layout** | No horizontal scroll at 360px x 640px across all four states (Normal, Sick, Evolved, queasy-egg active); button row switches to a 2-row grid below 640px; StatBars shrink from `w-64` to full-width minus 24px padding below 640px; title scales from `text-3xl` to `text-2xl` below 640px; PetStage floor strip uses `w-full max-w-xs mx-auto`. |
| **Metadata**          | `generateMetadata` in `layout.tsx` sets title, description, and openGraph fields (see Decisions); `/app/icon.svg` inline SVG matching the Pet shape in Normal palette replaces `favicon.ico`; `/app/opengraph-image.tsx` using Next.js built-in OG image generator renders a 1200x630 card.                                                      |
| **Deploy**            | `.vercelignore` excluding `tests/`, `specs/`, `CHANGELOG.md`, `skills/`; `README.md` gains a "Deployment" section; `.github/workflows/ci.yml` running pnpm install, lint, typecheck, format:check, test, build on every push.                                                                                                                    |
| **Dev dependency**    | `@axe-core/playwright` added to `devDependencies` only. This is the single exception to the no-new-deps rule and is documented explicitly in Decisions.                                                                                                                                                                                          |

### Out of Scope (explicitly deferred)

- Audio of any kind. No Web Audio API, no mute toggle, no audio mute persistence. Audio is deferred to a possible Phase 8 only if explicitly requested.
- PWA manifest, service worker, installability.
- Push notifications or any Notifications API usage.
- Analytics or error tracking services.
- Additional languages or i18n.
- Dark mode toggle. `prefers-color-scheme` detection is noted under Open Questions but not implemented in Phase 7.
- Any gameplay change: no new actions, no new states, no stat tuning.
- Vercel deploy step in CI (Vercel auto-deploys from main via its GitHub integration).

### Non-negotiables (Scope Contract from `mission.md`)

- No auth, users, accounts.
- No multi-pet data, inventories, currencies.
- No notifications APIs, mini-games, social features.
- No admin routes or debug UI.
- No permadeath.
- No new routes beyond `/`.

## Decisions

| Decision                 | Choice                                                                                                                                   | Why                                                                                                                                                                                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focus-visible ring       | Single rule in `globals.css`: `button:focus-visible { outline: 2px solid; outline-offset: 2px; }`                                        | One place to change; no per-component overrides to drift. Tailwind's `focus-visible:ring-*` utilities are not used here because the global rule is simpler and more resilient to component refactors.                                                                                                         |
| Skip-link target         | The first `<button>` inside `<section aria-label="Pet actions">`                                                                         | Consistent with the landmark structure; no extra `id` needed on the button itself because the skip-link can target the section and the browser will move focus to the first focusable child. The skip-link itself carries `id="skip-link"` and `href="#pet-actions"`. The section carries `id="pet-actions"`. |
| Landmark sections        | `<section aria-label="Pet actions">` and `<section aria-label="Pet vitals">` added in `page.tsx`                                         | Gives screen reader users a named region list. Does not change visual layout.                                                                                                                                                                                                                                 |
| Responsive breakpoint    | Tailwind `sm:` prefix (640px) for all responsive overrides                                                                               | Matches the existing Tailwind config; no custom breakpoint needed.                                                                                                                                                                                                                                            |
| Button row at mobile     | `grid grid-cols-2` below 640px, `flex flex-row` at 640px and above                                                                       | A 2-column grid keeps buttons large enough to tap at 360px without horizontal overflow. The Heal button (visible only when Sick) fits in the grid as a third item spanning both columns.                                                                                                                      |
| StatBar width at mobile  | `w-full px-3` below 640px (full-width minus 24px padding), `w-64` at 640px and above                                                     | Matches the existing `w-64` pattern; no new CSS Module needed.                                                                                                                                                                                                                                                |
| PetStage floor strip     | `w-full max-w-xs mx-auto`                                                                                                                | Keeps the stage centered and bounded without a fixed pixel width that would overflow at 360px.                                                                                                                                                                                                                |
| Metadata location        | `generateMetadata` export in `src/app/layout.tsx`                                                                                        | Layout-level metadata applies to every route; no per-page duplication.                                                                                                                                                                                                                                        |
| OG title                 | `"Tiny Tamagotchi — a pet that lives in your browser"`                                                                                   | Descriptive, fits OG card width, no truncation at 1200px.                                                                                                                                                                                                                                                     |
| OG description           | `"Feed, play, rest, and grow a pixel companion. Lives entirely on this device."`                                                         | Matches the care loop vocabulary; no marketing filler.                                                                                                                                                                                                                                                        |
| OG type                  | `'website'`                                                                                                                              | Correct for a single-page app with no article or product schema.                                                                                                                                                                                                                                              |
| Icon                     | `/app/icon.svg` inline SVG matching the Pet shape (Normal palette: `currentColor` body, `var(--pet-eye)` eyes, `var(--pet-mouth)` mouth) | No binary asset added to the repo. Next.js serves `app/icon.svg` as the favicon automatically. `favicon.ico` is removed.                                                                                                                                                                                      |
| OG image                 | `/app/opengraph-image.tsx` using `ImageResponse` from `next/og`                                                                          | No external image, no binary asset. Renders at 1200x630 with the pet SVG centered and the title below. Font is the system sans-serif stack (no Google Fonts fetch).                                                                                                                                           |
| `.vercelignore`          | Excludes `tests/`, `specs/`, `CHANGELOG.md`, `skills/`                                                                                   | Keeps the Vercel build artifact lean; none of these directories affect the production bundle.                                                                                                                                                                                                                 |
| CI workflow              | `.github/workflows/ci.yml` on `push` and `pull_request`: pnpm install, lint, typecheck, format:check, test, build                        | Catches regressions before merge. No deploy step because Vercel handles that via its GitHub integration.                                                                                                                                                                                                      |
| New dev dependency       | `@axe-core/playwright` in `devDependencies`                                                                                              | Required for the automated axe-core accessibility scan in the browser verification script. This is the only new dependency this phase. No production bundle impact.                                                                                                                                           |
| No environment variables | The app is 100% client-side. No `NEXT_PUBLIC_*` or server-side env vars are required.                                                    | Documented explicitly so the deploy section of README.md can state this clearly.                                                                                                                                                                                                                              |

## Context

### Tone and conventions

- User-facing strings introduced this phase: `"Skip to actions"` (skip-link text). No other new copy.
- The skip-link is visually hidden until focused. It uses Tailwind's `sr-only` class when not focused and `not-sr-only` when focused, or an equivalent CSS pattern already present in `globals.css`.
- No emoji in any spec or source file.
- Sentence case for aria labels: `"Pet actions"`, `"Pet vitals"`.

### Stack pointers (see `specs/tech-stack.md`)

- Next.js 14+ App Router. `generateMetadata` is the App Router API for metadata.
- Tailwind CSS v4. Responsive prefixes: `sm:` = 640px.
- `@axe-core/playwright` is a devDependency; it does not ship in the production bundle.
- pnpm. The CI workflow uses `pnpm` throughout.

### Existing patterns to follow

- `globals.css` already exists at `src/styles/globals.css` (imported in `layout.tsx`). The focus-visible rule goes there.
- `Pet.tsx` already uses inline SVG with `currentColor` and CSS variables. The `/app/icon.svg` must use the same shape and variable names so the icon matches the on-screen pet.
- `StatBar.tsx` currently uses `w-64` as a fixed width. Phase 7 makes this responsive without changing the component's prop interface.
- `page.tsx` currently has a `<div className="flex gap-3">` wrapping the buttons. Phase 7 replaces this with the landmark section and responsive grid.
- The StateAnnouncer component from Phase 4 is not modified. Its `aria-live` region stays in place.

### Open Questions

- `prefers-color-scheme`: the app currently has no dark mode. A future phase could add a CSS variable swap driven by the media query. Not in scope for Phase 7.
- Manual QA browsers: Chrome, Firefox, Safari on macOS; Chrome on Android (360px viewport emulation). Safari on iOS is a stretch goal for the manual checklist but not a gate.
