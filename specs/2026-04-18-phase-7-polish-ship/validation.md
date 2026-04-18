# Phase 7 — Polish & Ship: Validation

## Automated

Run from `tiny-tamagotchi/`. Every command must exit with code 0.

| Command | Must produce |
| --- | --- |
| `pnpm lint` | Zero errors, zero warnings. |
| `pnpm typecheck` | `tsc --noEmit` passes. |
| `pnpm format:check` | Prettier reports all files formatted. |
| `pnpm test` | All prior tests still pass plus Phase 7 landmark and responsive RTL tests. Zero failures, zero skipped. |
| `pnpm build` | Next.js production build succeeds. |

### Specific assertions

**Accessibility**

- `src/styles/globals.css` contains exactly one `button:focus-visible` rule with `outline: 2px solid` and `outline-offset: 2px`. No other `button:focus-visible` or `button:focus` rules exist in any component file.
- `src/app/page.tsx` contains an `<a>` element with `href="#pet-actions"` and text content `"Skip to actions"` as the first child of `<main>`.
- `src/app/page.tsx` contains `<section aria-label="Pet vitals">` wrapping the three StatBars.
- `src/app/page.tsx` contains `<section aria-label="Pet actions" id="pet-actions">` wrapping the button row.
- `tests/components/landmarks.test.tsx` asserts `getByRole('region', { name: 'Pet vitals' })` contains exactly three `progressbar` elements.
- `tests/components/landmarks.test.tsx` asserts `getByRole('region', { name: 'Pet actions' })` contains at least one `button` element.
- The StateAnnouncer component is unchanged from Phase 4: it still renders an `aria-live="polite"` region.

**Responsive layout**

- `src/components/StatBar.tsx` outer `<div>` class includes `w-full` and `sm:w-64`. The class `w-64` without a breakpoint prefix does not appear on that element.
- `src/app/page.tsx` `<h1>` class includes `text-2xl` and `sm:text-3xl`. The class `text-3xl` without a breakpoint prefix does not appear on that element.
- `src/app/page.tsx` button row container class includes `grid` and `grid-cols-2` and `sm:flex`.
- `src/components/PetStage.tsx` stage element class includes `w-full` and `max-w-xs` and `mx-auto`.
- `tests/components/responsive.test.tsx` renders the page and asserts `document.body.scrollWidth <= 360` (structural guard).

**Metadata**

- `src/app/layout.tsx` exports `metadata` with `title` equal to `"Tiny Tamagotchi — a pet that lives in your browser"`.
- `src/app/layout.tsx` exports `metadata` with `description` equal to `"Feed, play, rest, and grow a pixel companion. Lives entirely on this device."`.
- `src/app/layout.tsx` exports `metadata.openGraph.type` equal to `'website'`.
- `src/app/icon.svg` exists and contains a valid SVG with `viewBox="0 0 64 64"`.
- `public/favicon.ico` does not exist (deleted).
- `src/app/opengraph-image.tsx` exists and exports `size`, `contentType`, and a default function returning `ImageResponse`.

**Deploy infrastructure**

- `.vercelignore` exists at `tiny-tamagotchi/.vercelignore` and contains lines for `tests/`, `specs/`, `CHANGELOG.md`, `skills/`.
- `.github/workflows/ci.yml` exists and contains steps for `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm test`, `pnpm build`.
- `package.json` `devDependencies` contains `@axe-core/playwright`. It does not appear in `dependencies`.
- `package.json` `dependencies` matches the Phase 6 whitelist exactly. No new runtime dependency has been added. (The whitelist is: `next`, `react`, `react-dom`, `zustand` or equivalent state lib from prior phases. Any entry not on this list is a validation failure.)

## Manual

### Walkthrough

1. `pnpm dev` → `http://localhost:3000`.
2. Press Tab once. Focus moves to the skip-link `"Skip to actions"`. The link becomes visible (not `sr-only`).
3. Press Enter on the skip-link. Focus moves to the first button inside `<section aria-label="Pet actions">` (the Feed button, or the first enabled button in document order).
4. Continue tabbing through all buttons. Each button shows a visible focus ring (2px outline) when focused.
5. Open a screen reader (VoiceOver on macOS or NVDA on Windows). Navigate by landmarks. Confirm two named regions appear: `"Pet vitals"` and `"Pet actions"`.
6. Resize the browser to 360px wide. Confirm:
   - No horizontal scrollbar appears.
   - The title is smaller (text-2xl).
   - The three StatBars stretch to full width minus padding.
   - The button row shows two columns.
   - The Heal button (trigger Sick state first) spans both columns.
7. Resize back to 640px and above. Confirm the layout returns to the desktop arrangement.
8. Inspect the page `<head>`. Confirm `<title>` is `"Tiny Tamagotchi — a pet that lives in your browser"`.
9. Fetch `/opengraph-image` in the browser. Confirm a 1200x630 PNG loads with the pet centered and the title below.
10. Confirm the browser tab favicon shows the pet SVG shape.
11. `pnpm build && pnpm start` shows identical behavior.

### Behavior

- No console errors or React warnings.
- Focus ring is visible on every button when tabbed to, in all four pet states (Normal, Sick, Evolved, queasy-egg active).
- Skip-link is invisible until focused; it does not affect the visual layout when not focused.
- Landmark regions do not change the visual layout.
- StatBars at 360px have no horizontal overflow.
- Button grid at 360px has no horizontal overflow.

### Accessibility

- Every interactive element has an accessible name. The skip-link text is `"Skip to actions"`. Each button's accessible name comes from its visible label. Each StatBar's accessible name comes from its `aria-label`.
- `prefers-reduced-motion: reduce` still stops all Phase 1 and Phase 6 animations. No new animations were introduced in Phase 7, so no new reduced-motion guard is needed. The audit in plan step 1.5 confirmed all existing guards are in place.
- Tab order is: skip-link, then the pet stage (if focusable), then the vitals section (not focusable), then the actions section buttons in document order.

### Edge cases

- Sick state at 360px: the Heal button appears and spans both columns. No overflow.
- Evolved state at 360px: the crown or evolved indicator does not cause overflow.
- Queasy-egg animation active at 360px: the animation plays within the PetStage bounds. No overflow.
- OG image route at `/opengraph-image`: returns 200 with `content-type: image/png` (or `image/*`). No 404, no 500.
- Viewport meta tag: the page `<head>` contains exactly one `<meta name="viewport">` tag (injected by Next.js). No duplicate.

### Browser verification

Run after the automated suite passes and before merging. This script covers what jsdom cannot: real layout at 360px, real focus ring rendering, real axe-core scan, and real OG image response.

Load the webapp-testing skill and run:

```
scripts/with_server.py --server "pnpm dev" --port 3000 -- python phase-7-browser.py
```

The script performs the following steps in order. Each step is a gate: failure stops the run.

**Step 1 — Baseline**

Navigate to `http://localhost:3000`, `wait_for_load_state('networkidle')`, screenshot `/tmp/phase-7-initial.png`.

**Step 2 — Skip-link existence and function**

- Query `a[href="#pet-actions"]`. Assert it exists in the DOM.
- Assert its computed style has `position: absolute` or equivalent visually-hidden style when not focused (confirming it is off-screen by default).
- Focus the skip-link via `page.focus('a[href="#pet-actions"]')`. Assert `document.activeElement === the skip-link element`.
- Press Enter (or call `click()`). Assert `document.activeElement` is the first `<button>` inside `<section[aria-label="Pet actions"]>`. This is the concrete linkage test: skip-link focus lands on the first action button.

**Step 3 — Focus-visible ring**

- Tab to the first button using `page.keyboard.press('Tab')` until a button is focused.
- Assert `window.getComputedStyle(document.activeElement).outlineWidth` is not `"0px"`. The computed outline-width must be greater than 0, confirming the `button:focus-visible` rule is applied and not overridden.

**Step 4 — Landmark regions**

- Assert `page.getByRole('region', { name: 'Pet vitals' })` exists.
- Assert that region contains exactly three elements with `role="progressbar"`.
- Assert `page.getByRole('region', { name: 'Pet actions' })` exists.
- Assert that region contains at least one `role="button"` element.

**Step 5 — axe-core accessibility scan**

- Import `@axe-core/playwright` and run `checkA11y(page)` with no rule exclusions.
- Assert zero violations. Any violation is a hard failure. The scan catches: missing accessible names, invalid ARIA roles, color contrast failures (if any), duplicate IDs, and missing landmark structure.

**Step 6 — Responsive layout at 360x640 (Normal state)**

- Set viewport to `{ width: 360, height: 640 }`.
- Navigate to `http://localhost:3000`, `wait_for_load_state('networkidle')`.
- Assert `page.evaluate(() => document.documentElement.scrollWidth) <= 360`. No horizontal overflow.
- Screenshot `/tmp/phase-7-360-normal.png`.

**Step 7 — Responsive layout at 360x640 (Sick state)**

- Trigger Sick state by dispatching the game reducer directly via `page.evaluate` or by waiting for natural decay (use fake timers if available in the dev build). Alternatively, expose a `window.__DEBUG_SET_STATE__` hook in development only.
- Assert `document.documentElement.scrollWidth <= 360`. No horizontal overflow in Sick state.
- Assert the Heal button is visible and has `col-span-2` class (or equivalent spanning behavior).
- Screenshot `/tmp/phase-7-360-sick.png`.

**Step 8 — Responsive layout at 360x640 (Evolved state)**

- Trigger Evolved state via the same debug hook.
- Assert `document.documentElement.scrollWidth <= 360`.
- Screenshot `/tmp/phase-7-360-evolved.png`.

**Step 9 — OG image route**

- Fetch `http://localhost:3000/opengraph-image` using `page.request.get('/opengraph-image')`.
- Assert response status is 200.
- Assert response headers `content-type` matches `image/png` or `image/*`.

**Step 10 — Metadata in page source**

- Fetch the raw HTML of `http://localhost:3000` using `page.content()`.
- Assert the HTML contains `<title>Tiny Tamagotchi` (partial match is sufficient; Next.js may append a suffix).
- Assert the HTML contains `<meta name="viewport"` exactly once (no duplicate viewport tag).
- Assert the HTML contains `<meta property="og:type" content="website"`.

**Step 11 — Console audit**

- Assert zero `pageerror` events across all steps.
- Assert zero `console.error` calls.

**Step 12 — Final screenshot**

Screenshot `/tmp/phase-7-final.png` at 1280x800 viewport for the PR.

A passing run of this script is the gate for merging Phase 7.

## Tone check

New copy introduced this phase: `"Skip to actions"` (skip-link text), `"Pet actions"` (aria-label), `"Pet vitals"` (aria-label), `"Tiny Tamagotchi — a pet that lives in your browser"` (page title and OG title), `"Feed, play, rest, and grow a pixel companion. Lives entirely on this device."` (meta description and OG description).

- Exact spelling and casing as listed above.
- No emoji in any of these strings.
- No marketing filler.
- No additional copy beyond this list.

## Scope Contract check

Confirm Phase 7 introduced nothing from the scope contract's forbidden list:

- No auth, users, accounts.
- No multi-pet data, inventories, currencies.
- No notifications APIs, mini-games, social features.
- No admin routes or debug UI in production bundles.
- No permadeath.
- No new routes beyond `/` (the OG image route at `/opengraph-image` is a Next.js built-in file convention, not a user-navigable route).
- No audio of any kind.
- No PWA manifest or service worker.
- No gameplay changes: no new actions, no new states, no stat tuning.
- No new runtime dependencies (only `@axe-core/playwright` in devDependencies).

If any of the above appears in the diff, fail validation and remove it.

## Definition of Done

Phase 7 is complete when all of the following are true:

- [ ] Branch `phase-7-polish-ship` contains only Phase 7 commits.
- [ ] Every command in the Automated table exits 0 on a fresh clone.
- [ ] Every Specific assertion holds true.
- [ ] The Manual walkthrough matches exactly, including skip-link focus behavior, focus ring visibility, landmark navigation, responsive layout at 360px, and OG image response.
- [ ] Tone check passes.
- [ ] Browser verification script ran clean: skip-link lands focus on first action button, focus ring computed outline-width > 0, landmark regions contain correct children, axe-core reports zero violations, scrollWidth <= 360 across Normal/Sick/Evolved states, OG image returns 200 image/png, viewport meta appears exactly once, zero console errors.
- [ ] Scope Contract check passes.
- [ ] `CHANGELOG.md` has new bullets summarizing Phase 7 deliverables.
- [ ] No TODO/FIXME comments left in the diff.
- [ ] `specs/roadmap.md` Phase 7 deliverables can honestly be ticked.
- [ ] Production URL is added to `README.md` after the first Vercel deploy.
