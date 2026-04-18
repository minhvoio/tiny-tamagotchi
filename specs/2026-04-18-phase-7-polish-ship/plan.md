# Phase 7 — Polish & Ship: Plan

Three independent pillars, then deploy infrastructure. Build each pillar to green before moving to the next. The deploy pillar has no runtime code and can be done in any order relative to the others.

---

## 1. Accessibility pillar

### 1.1 Focus-visible ring (globals.css)

Add one rule to `src/styles/globals.css`:

```css
button:focus-visible {
  outline: 2px solid;
  outline-offset: 2px;
}
```

No per-component overrides. No Tailwind `focus-visible:ring-*` utilities on individual buttons.

Run `pnpm typecheck` to confirm no TS errors from the CSS change (there should be none).

### 1.2 Skip-link

In `src/app/page.tsx`, add a skip-link as the first child of `<main>`:

```tsx
<a
  href="#pet-actions"
  className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black"
>
  Skip to actions
</a>
```

The `<section>` wrapping the button row receives `id="pet-actions"`.

### 1.3 Landmark sections

In `src/app/page.tsx`:

- Wrap the three StatBars in `<section aria-label="Pet vitals">`.
- Wrap the button row (Feed, Play, Rest, and the conditionally rendered Heal button) in `<section aria-label="Pet actions" id="pet-actions">`.

The existing `<div className="flex gap-3">` around the buttons is replaced by this section. The section's internal layout classes move to the section element.

### 1.4 Verify StateAnnouncer is untouched

Read `src/components/StateAnnouncer.tsx` (or wherever Phase 4 placed it). Confirm it still renders an `aria-live="polite"` region. Make no changes. Add a comment in the plan: "StateAnnouncer is read-only in Phase 7."

### 1.5 Reduced-motion audit

Read `src/styles/pet.module.css` and `src/styles/globals.css`. Confirm every `@keyframes` block is wrapped in a `@media (prefers-reduced-motion: no-preference)` guard or that the animation property is reset inside `@media (prefers-reduced-motion: reduce)`. Phase 7 introduces no new animations, so this is an audit step only. If a gap is found, add the missing guard. Document the finding in the commit message.

### 1.6 RTL tests for landmark regions

In `tests/components/landmarks.test.tsx` (new file):

- Assert `getByRole('region', { name: 'Pet vitals' })` exists.
- Assert that region contains exactly three `progressbar` elements.
- Assert `getByRole('region', { name: 'Pet actions' })` exists.
- Assert that region contains at least one `button` element.

Run `pnpm test` — new tests green, all prior tests still green.

---

## 2. Responsive layout pillar

### 2.1 Title responsive size

In `src/app/page.tsx`, change the `<h1>` class from `text-3xl` to `text-2xl sm:text-3xl`.

### 2.2 StatBar responsive width

In `src/components/StatBar.tsx`, change the outer `<div>` class from `w-64` to `w-full px-3 sm:w-64 sm:px-0`.

No prop interface change. The `label`, `value`, and `max` props are unchanged.

### 2.3 Button row responsive grid

In `src/app/page.tsx`, replace the button row container class with `grid grid-cols-2 gap-3 sm:flex sm:flex-row`.

The Heal button (rendered only when `state.state === 'Sick'`) spans both columns at mobile: add `col-span-2` to the Heal button's wrapper or to `HealButton` directly. At `sm:` and above, `col-span-2` has no effect inside a flex container.

### 2.4 PetStage floor strip

In `src/components/PetStage.tsx`, change the stage `<div>` class to include `w-full max-w-xs mx-auto` (replacing any fixed pixel width if present). Confirm the existing `styles.stage` CSS Module class does not set a conflicting fixed width; if it does, remove the conflicting property.

### 2.5 Responsive overflow RTL test

In `tests/components/responsive.test.tsx` (new file):

- Render the full page at a simulated 360px container width using `jsdom` and RTL.
- Assert no element has a `scrollWidth` greater than 360 (use `document.body.scrollWidth <= 360`).

Note: jsdom does not compute real CSS layout, so this test is a structural guard (no element has a hardcoded `w-64` or similar class that would overflow) rather than a pixel-accurate layout test. The pixel-accurate test is in the browser verification script (see validation.md).

---

## 3. Metadata and branding pillar

### 3.1 generateMetadata in layout.tsx

Replace the static `export const metadata` in `src/app/layout.tsx` with:

```ts
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tiny Tamagotchi — a pet that lives in your browser',
  description:
    'Feed, play, rest, and grow a pixel companion. Lives entirely on this device.',
  openGraph: {
    title: 'Tiny Tamagotchi — a pet that lives in your browser',
    description:
      'Feed, play, rest, and grow a pixel companion. Lives entirely on this device.',
    type: 'website',
  },
};
```

The existing `<html lang="en">` and `<body>` structure is unchanged.

### 3.2 Inline SVG icon

Create `src/app/icon.svg` with the same SVG shape as `Pet.tsx`:

- `viewBox="0 0 64 64"`.
- Body ellipse, head cap ellipse, two eye circles, mouth path.
- Fill color: `#6ee7b7` (the Normal palette emerald-300 equivalent, since CSS variables do not resolve in a standalone SVG file served as a favicon).
- Eye fill: `#1f2937` (neutral-800).
- Mouth stroke: `#1f2937`.

Delete `public/favicon.ico`. Next.js App Router serves `app/icon.svg` as the favicon automatically when `favicon.ico` is absent.

### 3.3 OG image route

Create `src/app/opengraph-image.tsx`:

```tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Tiny Tamagotchi — a pet that lives in your browser';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: '#f0fdf4',
        }}
      >
        {/* Pet SVG centered */}
        <svg viewBox="0 0 64 64" width={160} height={160}>
          <ellipse cx="32" cy="36" rx="20" ry="18" fill="#6ee7b7" />
          <ellipse cx="32" cy="22" rx="14" ry="10" fill="#6ee7b7" />
          <circle cx="26" cy="22" r="2.2" fill="#1f2937" />
          <circle cx="38" cy="22" r="2.2" fill="#1f2937" />
          <path
            d="M28 30 Q32 33 36 30"
            stroke="#1f2937"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <p
          style={{
            fontSize: 48,
            fontFamily: 'sans-serif',
            color: '#1f2937',
            marginTop: 32,
          }}
        >
          Tiny Tamagotchi
        </p>
      </div>
    ),
    { ...size },
  );
}
```

No external image. No binary asset added to the repo. Font is the system sans-serif stack; no Google Fonts fetch.

### 3.4 Viewport meta tag audit

Confirm `src/app/layout.tsx` does not explicitly set a viewport meta tag (Next.js App Router injects `<meta name="viewport" content="width=device-width, initial-scale=1">` automatically). If a manual viewport tag exists, remove it to avoid duplication.

---

## 4. Deploy infrastructure pillar

### 4.1 .vercelignore

Create `.vercelignore` at the repo root of `tiny-tamagotchi/`:

```
tests/
specs/
CHANGELOG.md
skills/
```

### 4.2 README.md Deployment section

Add a "Deployment" section to `README.md` after the "Commands" section:

```markdown
## Deployment

The app is 100% client-side. No environment variables are required.

To deploy to Vercel for the first time:

1. Install the Vercel CLI: `npm install -g vercel`
2. Run `vercel link` to connect the project to your Vercel account.
3. Run `vercel --prod` to deploy.

After the first deploy, Vercel auto-deploys every push to `main` via its GitHub integration. The production URL is listed here once the first deploy completes:

**Production URL:** _add after first deploy_
```

### 4.3 GitHub Actions CI workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: tiny-tamagotchi
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: tiny-tamagotchi/pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm format:check
      - run: pnpm test
      - run: pnpm build
```

No deploy step. Vercel handles production deploys via its own GitHub integration.

### 4.4 Install @axe-core/playwright

Run `pnpm add -D @axe-core/playwright` from `tiny-tamagotchi/`. Confirm it appears in `devDependencies` in `package.json` and not in `dependencies`.

---

## 5. Full green-bar verification

5.1. Run: `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build`. All exit 0.

5.2. Confirm new tests added: `tests/components/landmarks.test.tsx` (landmark regions), `tests/components/responsive.test.tsx` (structural overflow guard). All prior tests still pass.

5.3. Update `CHANGELOG.md` with Phase 7 bullets before merging.

5.4. Suggested commit breakdown:

- `feat(phase-7): add focus-visible ring to globals.css and skip-link to page`
- `feat(phase-7): wrap vitals and actions in landmark sections`
- `feat(phase-7): responsive layout at 360px (title, StatBars, button grid, PetStage)`
- `feat(phase-7): generateMetadata, inline SVG icon, OG image route`
- `feat(phase-7): add .vercelignore, CI workflow, README deploy section`
- `chore(phase-7): add @axe-core/playwright to devDependencies`
- `test(phase-7): landmark region and responsive overflow RTL tests`
- `docs(phase-7): record phase 7 in changelog`
