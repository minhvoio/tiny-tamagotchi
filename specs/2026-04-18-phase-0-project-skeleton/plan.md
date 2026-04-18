# Phase 0 — Project Skeleton: Plan

Each group is independently implementable and verifiable. Complete them top-to-bottom; the validation file defines "done" per group.

---

## 1. Bootstrap the Next.js app

1.1. From repo root, run `pnpm create next-app@latest tiny-tamagotchi --typescript --tailwind --eslint --app --src-dir --use-pnpm --import-alias "@/*"`.

- Accept defaults where prompted; preserve the existing `tiny-tamagotchi/specs/` directory (move it aside first if the generator refuses to write into a non-empty folder, then restore).
  1.2. Verify `pnpm dev` serves the generator's default page at `http://localhost:3000`.
  1.3. Commit the generated tree: `chore(phase-0): bootstrap next.js app`.

## 2. Lock down TypeScript & imports

2.1. Open `tiny-tamagotchi/tsconfig.json`; confirm `"strict": true`, `"noUncheckedIndexedAccess": true` (add if missing), and the `@/*` path alias points to `src/*`.
2.2. Run `pnpm exec tsc --noEmit` — must pass cleanly.
2.3. Add a `typecheck` script to `package.json`: `"typecheck": "tsc --noEmit"`.

## 3. Configure Prettier + ESLint harmony

3.1. Install dev deps: `pnpm add -D prettier eslint-config-prettier`.
3.2. Add `.prettierrc` at `tiny-tamagotchi/` root with project defaults: `{"semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100}`.
3.3. Add `.prettierignore` excluding `.next/`, `node_modules/`, `coverage/`, `public/`.
3.4. Extend the ESLint config (flat config `eslint.config.mjs` if present, else `.eslintrc.json`) to include `"prettier"` last so it disables stylistic rules.
3.5. Add scripts: `"format": "prettier --write ."`, `"format:check": "prettier --check ."`.
3.6. Run `pnpm lint` and `pnpm format:check` — both pass.

## 4. Wire up Vitest + React Testing Library

4.1. Install dev deps: `pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`.
4.2. Create `vitest.config.ts` at `tiny-tamagotchi/` root:

- `plugins: [react()]`
- `test: { environment: 'jsdom', globals: true, setupFiles: ['./tests/setup.ts'], include: ['tests/**/*.test.{ts,tsx}'] }`
- `resolve: { alias: { '@': path.resolve(__dirname, 'src') } }`
  4.3. Create `tests/setup.ts`: `import '@testing-library/jest-dom/vitest';`.
  4.4. Create the smoke test `tests/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
describe('smoke', () => {
  it('arithmetic works', () => {
    expect(1 + 1).toBe(2);
  });
});
```

4.5. Add script: `"test": "vitest run"`, plus `"test:watch": "vitest"`.
4.6. Run `pnpm test` — the smoke test passes.

## 5. Scaffold the project folders

5.1. Create empty directories with `.gitkeep` markers:

- `src/components/.gitkeep`
- `src/game/.gitkeep`
- `src/hooks/.gitkeep`
- `src/styles/.gitkeep`
- `public/sprites/.gitkeep`
  5.2. Confirm `src/app/` and `tests/` already exist from earlier steps.
  5.3. Do **not** add README stubs to any folder (per user direction).

## 6. Minimal root page & layout

6.1. Replace `src/app/page.tsx` with a component rendering exactly:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-3xl font-semibold tracking-tight">Tiny Tamagotchi</h1>
    </main>
  );
}
```

6.2. Update `src/app/layout.tsx` metadata:

- `title: 'Tiny Tamagotchi'`
- `description: 'A tiny digital companion that lives in your browser.'`
- keep the generated font setup if minimal; otherwise remove custom font imports to stay zero-extras.
  6.3. Ensure `src/app/globals.css` contains only Tailwind's `@tailwind base; @tailwind components; @tailwind utilities;` (or the equivalent `@import "tailwindcss";` for Tailwind v4 if that's what the generator produced). No custom CSS in Phase 0.
  6.4. Remove any generator-added placeholder assets (`public/next.svg`, `public/vercel.svg`) that are unused by the new page.

## 7. Developer experience & hygiene

7.1. Confirm `.gitignore` excludes `node_modules/`, `.next/`, `out/`, `coverage/`, `.DS_Store`, `*.log`, `.env*.local`.
7.2. Ensure `package.json` scripts block is exactly:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "format": "prettier --write .",
  "format:check": "prettier --check ."
}
```

7.3. Write `tiny-tamagotchi/README.md` covering:

- One-sentence description (links to `specs/mission.md`).
- Prereqs: Node 18+, pnpm.
- Commands: `pnpm install`, `pnpm dev`, `pnpm test`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm format`.
- Pointer to `specs/roadmap.md` for what ships in each phase.

## 8. Full green-bar verification

8.1. Run in sequence: `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build`. All must exit 0.
8.2. Run `pnpm dev` and manually verify `http://localhost:3000` renders only the "Tiny Tamagotchi" title.
8.3. Scan the repo for stray files from the generator that aren't listed above and delete them (e.g., unused SVGs, example CSS).
8.4. Final commit(s) with conventional-commit style messages, one per task group where possible.
