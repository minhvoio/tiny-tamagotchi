# Phase 2 — One Living Vital (Hunger): Plan

Each group is independently implementable and testable. Build in order; later groups depend on earlier ones.

---

## 1. Pure game core (test-first)

1.1. Create `src/game/constants.ts` exporting `MAX_STAT`, `MIN_STAT`, `TICK_INTERVAL_MS`, `DECAY_PER_TICK`, `FEED_AMOUNT`.
1.2. Create `src/game/state.ts` exporting types `Stat`, `Vitals` (only `{ hunger: Stat }` in Phase 2), `PetModel` (only `{ vitals: Vitals }` in Phase 2), `Action` (union of `FEED` and `TICK`), and `initialState: PetModel` with hunger = 100.
1.3. Create `src/game/util.ts` with `export function clamp(value: number, min: number, max: number): number { ... }`. Cover it with trivial inline tests in the reducer test file.
1.4. Create `tests/game/reducer.test.ts` first with the test cases listed in `requirements.md` §"Tests — reducer". All tests fail (no implementation yet).
1.5. Create `src/game/reducer.ts` implementing:

- `FEED`: `hunger = clamp(hunger + FEED_AMOUNT, 0, MAX_STAT)`.
- `TICK`: `const decay = Math.floor((elapsedMs / TICK_INTERVAL_MS) * DECAY_PER_TICK); hunger = clamp(hunger - decay, 0, MAX_STAT);`
- `default`: return state unchanged.
  1.6. Run `pnpm test` — reducer tests go green.

## 2. Tick hook

2.1. Create `tests/hooks/useTick.test.tsx` with `vi.useFakeTimers()`, a harness component that accepts a dispatch spy, mounts `useTick(dispatchSpy, 1000)`, advances 3s, asserts 3 calls with `{ type: 'TICK', elapsedMs: 1000 }`. Include an unmount test: hook cleans up the interval (advance time after unmount, no extra calls).
2.2. Create `src/hooks/useTick.ts`:

- `export function useTick(dispatch: (a: Action) => void, intervalMs: number): void`
- `useEffect(() => { const id = setInterval(() => dispatch({ type: 'TICK', elapsedMs: intervalMs }), intervalMs); return () => clearInterval(id); }, [dispatch, intervalMs]);`
  2.3. Run `pnpm test` — hook tests go green.

## 3. Provider + useTamagotchi

3.1. Create `src/hooks/useTamagotchi.tsx` as a `"use client"` module:

- `const TamagotchiContext = createContext<{ state: PetModel; dispatch: Dispatch<Action> } | null>(null);`
- `TamagotchiProvider({ children, tickIntervalMs = TICK_INTERVAL_MS }: { children: ReactNode; tickIntervalMs?: number })` uses `useReducer(reducer, initialState)` and calls `useTick(dispatch, tickIntervalMs)`.
- `useTamagotchi()` reads the context and throws `Error('useTamagotchi must be used inside <TamagotchiProvider>')` if null.
  3.2. Add `tests/hooks/useTamagotchi.test.tsx`:
- Render a child component inside the provider that reads state and dispatches FEED; assert state updates.
- Render a child outside the provider; expect the error to be thrown on render (wrap in `expect(...).toThrow`).
  3.3. Run `pnpm test` — provider tests go green.

## 4. UI: StatBar

4.1. Create `tests/components/StatBar.test.tsx` asserting:

- `role="progressbar"` with `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-label="Hunger"`.
- Numeric readout `42 / 100` visible for value 42.
- When `value=0`, bar fill width is 0 (check via style or data attribute).
  4.2. Create `src/components/StatBar.tsx`:
- Props `{ label: string; value: number; max?: number }` with `max` defaulting to `MAX_STAT`.
- Renders label, numeric readout, and a Tailwind bar (outer rounded div, inner div with `style={{ width: (value / max) * 100 + '%' }}`).
- `role="progressbar"` and the full set of ARIA attributes above.
  4.3. Run `pnpm test` — StatBar tests go green.

## 5. UI: FeedButton

5.1. Create `tests/components/FeedButton.test.tsx` (wrap renders in `TamagotchiProvider`):

- Initially enabled when hunger < 100. After clicking while hunger < 80, hunger increases by `FEED_AMOUNT`.
- When hunger === 100, button is disabled (`aria-disabled="true"` and/or the real `disabled` prop) and click is a no-op.
  5.2. Create `src/components/FeedButton.tsx` (`"use client"`):
- `const { state, dispatch } = useTamagotchi();`
- `const disabled = state.vitals.hunger >= MAX_STAT;`
- `<button type="button" disabled={disabled} onClick={() => dispatch({ type: 'FEED' })}>Feed</button>`
  5.3. Run `pnpm test` — FeedButton tests go green.

## 6. Wire up the page

6.1. Update `src/app/page.tsx` to wrap existing markup in `<TamagotchiProvider>`:

- Keep `<h1>Tiny Tamagotchi</h1>`.
- `<PetStage><Pet /></PetStage>`.
- Below the stage: `<HungerBar />` — a tiny internal component (in `page.tsx` is fine) that reads `useTamagotchi()` and renders `<StatBar label="Hunger" value={state.vitals.hunger} />`.
- Below that: `<FeedButton />`.
- Use Tailwind to stack with `gap-6` and reasonable max-width.
  6.2. Run `pnpm dev` and visually verify:
- Hunger starts at 100 and decays visibly every 3 seconds.
- Feed restores by 20 and becomes disabled at 100.
- Pet animation still bobs.

## 7. Full green-bar verification

7.1. Run in sequence: `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build`. All exit 0.
7.2. Ensure test count increased: 3 (Phase 0+1) → 3 + reducer + useTick + useTamagotchi + StatBar + FeedButton ≈ 8+ passing tests.
7.3. Update `CHANGELOG.md` with Phase 2 bullets before merging (manual edit if same-day, else via skill).
7.4. Suggested commit breakdown:

- `feat(phase-2): add pure game core (state, reducer, constants)`
- `feat(phase-2): add useTick hook with cleanup`
- `feat(phase-2): add TamagotchiProvider and useTamagotchi hook`
- `feat(phase-2): add StatBar and FeedButton components`
- `feat(phase-2): mount hunger vital + feed button on home page`
- `test(phase-2): cover reducer, useTick, provider, StatBar, FeedButton`
- `docs(phase-2): record phase 2 in changelog`
