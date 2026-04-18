# Phase 5 — Persistence, Naming & Real-Time Aging: Plan

Extend Phase 4's game core with a storage adapter, two new actions, offline catch-up math, a blocking naming form, and a Reset flow. Build and test each layer before wiring the next.

---

## 1. Extend types, constants, and the action union

### 1.1. In `src/game/constants.ts`

Add:

```ts
export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000; // 8 hours
```

Keep all existing constants unchanged.

### 1.2. In `src/game/state.ts`

- Add `name: string` to `PetModel`. Place it as the first field for readability.
- Add `lastTickAt: number` to `PetModel`. Place it after `hasEvolved`.
- Update `initialState`: `name: ''`, `lastTickAt: 0`.
- Extend the `TICK` action: `{ type: 'TICK'; elapsedMs: number; nowMs: number }`.
- Add `{ type: 'RESET' }` to the `Action` union.
- Add `{ type: 'SET_NAME'; name: string }` to the `Action` union.
- Final `Action` union order: `FEED | PLAY | REST | HEAL | TICK | RESET | SET_NAME`.

Run `pnpm typecheck` after this step. Existing code will fail on the `TICK` shape change; the next step fixes it.

### 1.3. In `src/hooks/useTick.ts`

Update the dispatched action to include `nowMs: Date.now()`:

```ts
dispatch({ type: 'TICK', elapsedMs, nowMs: Date.now() });
```

Run `pnpm typecheck` again. Should be clean after this change.

---

## 2. Extend the reducer (test-first)

### 2.1. In `tests/game/reducer.test.ts`, add new describe blocks

**`TICK` sets `lastTickAt`:**

- Setup: any state with `lastTickAt: 0`.
- Dispatch: `{ type: 'TICK', elapsedMs: TICK_INTERVAL_MS, nowMs: 12345678 }`.
- Assert: returned state has `lastTickAt === 12345678`.
- This test catches the silent break where someone removes the `lastTickAt` assignment from the TICK branch.

**`RESET` atomicity test (named "RESET returns full initialState shape in one call"):**

- Setup: a state with `name: 'Buddy'`, `vitals: { hunger: 10, happiness: 5, energy: 20 }`, `state: 'Sick'`, `hasEvolved: true`, `neglectTicks: 5`, `careTicks: 3`, `lastTickAt: 9999`.
- Dispatch: `{ type: 'RESET' }`.
- Assert on the single returned object: `name === ''` AND `vitals.hunger === MAX_STAT` AND `vitals.happiness === MAX_STAT` AND `vitals.energy === MAX_STAT` AND `state === 'Normal'` AND `hasEvolved === false` AND `neglectTicks === 0` AND `careTicks === 0` AND `lastTickAt === 0` AND `isResting === false`. All fields in one assertion block, not across multiple dispatches.

**`SET_NAME` test:**

- Setup: `initialState` (name is `''`).
- Dispatch: `{ type: 'SET_NAME', name: 'Pixel' }`.
- Assert: returned state has `name === 'Pixel'` and all other fields unchanged.

### 2.2. In `src/game/reducer.ts`, add new branches

Add after the `HEAL` branch:

```ts
case 'TICK': {
  // existing tick logic...
  return { ...next, lastTickAt: action.nowMs };
}
case 'RESET': {
  return { ...initialState, name: '' };
}
case 'SET_NAME': {
  return { ...state, name: action.name };
}
```

The `TICK` branch already exists; update it to set `lastTickAt = action.nowMs` on the returned state. The `nowMs` field is now part of the action type.

### 2.3. Run `pnpm test`

All prior tests pass. New reducer tests go green.

---

## 3. Create the storage adapter

### 3.1. Create `src/game/storage.ts`

```ts
// pure: no React imports, no Date.now() calls
const STORAGE_KEY = 'tiny-tamagotchi:v1';
const SCHEMA_VERSION = 1;

export function isAvailable(): boolean { ... }
export function read(): PetModel | null { ... }
export function write(state: PetModel): void { ... }
export function clear(): void { ... }
```

Implementation rules:

- `isAvailable()`: try `localStorage.setItem` + `localStorage.removeItem` in a try/catch; return `true` if both succeed, `false` otherwise.
- `read()`: if `!isAvailable()` return `null`. Call `localStorage.getItem(STORAGE_KEY)`. If `null`, return `null`. Wrap `JSON.parse` in try/catch; on any error return `null`. If parsed object's `version` field !== `SCHEMA_VERSION`, return `null`. Otherwise return the parsed object cast to `PetModel` (TypeScript trusts the version check as a runtime guard).
- `write(state)`: if `!isAvailable()` return. Serialize `{ version: SCHEMA_VERSION, ...state }` and call `localStorage.setItem(STORAGE_KEY, json)`.
- `clear()`: if `!isAvailable()` return. Call `localStorage.removeItem(STORAGE_KEY)`.

### 3.2. Create `tests/game/storage.test.ts`

Tests (each is a separate `it` block):

- **write then read round-trip**: call `write(someState)`, then `read()`, assert the returned object matches `someState` field-by-field.
- **write puts correct key**: call `write(someState)`, assert `localStorage.getItem('tiny-tamagotchi:v1')` is a non-null string.
- **clear removes the key**: call `write(someState)`, then `clear()`, assert `localStorage.getItem('tiny-tamagotchi:v1')` is `null`.
- **corrupt JSON returns null**: call `localStorage.setItem('tiny-tamagotchi:v1', '{bad json}')` directly, then call `read()`, assert result is `null` and no exception is thrown. This test catches the silent break where someone removes the try/catch from `read()`.
- **version mismatch returns null**: call `localStorage.setItem('tiny-tamagotchi:v1', JSON.stringify({ version: 99, name: 'x' }))` directly, then call `read()`, assert result is `null`.
- **isAvailable returns true in jsdom**: assert `isAvailable() === true`.

Use `beforeEach(() => localStorage.clear())` to isolate tests.

### 3.3. Run `pnpm test`

Storage tests go green. All prior tests still pass.

---

## 4. Hydration and write-on-change in the Provider

### 4.1. Update `src/hooks/useTamagotchi.tsx`

Add hydration logic:

```ts
// On mount: read from storage, hydrate state, dispatch catch-up TICK
useEffect(() => {
  const stored = storage.read();
  if (stored && stored.name !== '') {
    // Replace reducer state with stored value
    dispatch({ type: '__HYDRATE__', state: stored }); // see §4.2
    const elapsedMs = Math.max(0, Math.min(Date.now() - stored.lastTickAt, MAX_OFFLINE_MS));
    dispatch({ type: 'TICK', elapsedMs, nowMs: Date.now() });
  }
}, []); // runs once on mount
```

Add write-on-change effect:

```ts
useEffect(() => {
  if (state.name !== '') {
    storage.write(state);
  } else {
    storage.clear();
  }
}, [state]);
```

### 4.2. Add `__HYDRATE__` action

The hydration flow needs to replace the entire state with the stored value before dispatching the catch-up TICK. Add `{ type: '__HYDRATE__'; state: PetModel }` to the `Action` union. The reducer branch returns `action.state` directly. This action is not part of the public game API; it is used only by the Provider's mount effect.

Update `src/game/state.ts` to add `__HYDRATE__` to the union. Update `src/game/reducer.ts` to handle it.

### 4.3. Integration tests for hydration

In `tests/integration/persistence.test.tsx`:

**Provider calls `storage.read()` on mount:**

- Spy on `storage.read`. Render `<TamagotchiProvider>`. Assert `storage.read` was called once.

**Provider calls `storage.write()` after a dispatch when name is non-empty:**

- Spy on `storage.write`. Render `<TamagotchiProvider>` with a pre-seeded stored state where `name: 'Pixel'`. Dispatch `{ type: 'FEED' }`. Assert `storage.write` was called with a state object where `name === 'Pixel'`. This test catches the silent break where someone removes the write-on-change `useEffect`.

**Provider calls `storage.clear()` when `state.name === ''`:**

- Spy on `storage.clear`. Render `<TamagotchiProvider>` with no stored state (name is `''`). Assert `storage.clear` was called. This test catches the silent break where someone forgets to call `storage.clear()` on RESET.

**Offline catch-up with `elapsedMs < MAX_OFFLINE_MS`:**

- Setup: write a stored state with `lastTickAt = Date.now() - 60_000` (1 minute ago), `vitals.hunger = 80`, `name: 'Pixel'`.
- Render `<TamagotchiProvider>`.
- Assert: the rendered state has `vitals.hunger` lower than 80 (decay applied) and `lastTickAt` updated to approximately `Date.now()`. This is a single hydration dispatch, not two.

**Offline catch-up with `elapsedMs > MAX_OFFLINE_MS` clamps to 8 hours:**

- Setup: write a stored state with `lastTickAt = Date.now() - 10 * 24 * 60 * 60 * 1000` (10 days ago), `name: 'Pixel'`.
- Render `<TamagotchiProvider>`.
- Assert: the catch-up TICK was dispatched with `elapsedMs === MAX_OFFLINE_MS` (not 10 days worth of ms). Verify by spying on `dispatch` or by asserting the resulting vitals match exactly 8 hours of decay, not 10 days. This test catches the silent break where someone changes `MAX_OFFLINE_MS` to `Infinity`.

---

## 5. Naming form in `src/app/page.tsx`

### 5.1. Add the naming gate

At the top of the page component's render, before any pet UI:

```tsx
if (state.name === '') {
  return <NamingForm dispatch={dispatch} />;
}
```

This test catches the silent break where someone removes the name-required gate: a render test asserts the naming form is present when `state.name === ''` regardless of other state fields.

### 5.2. Create `src/components/NamingForm.tsx`

Props: `{ dispatch: Dispatch<Action> }`.

Renders:

- A `<form>` element (not a `<dialog>`).
- A heading: `"Name your pet"`.
- A `<label>` with `htmlFor` pointing to the input.
- A `<input type="text" placeholder="Enter a name" maxLength={24} />`.
- A `<button type="submit">Confirm</button>`.
- An inline error `<p>` that renders `"Name must be 1-24 characters"` when validation fails; hidden otherwise.

On submit:

1. `event.preventDefault()`.
2. Trim the input value.
3. If trimmed is empty or longer than 24 chars, set the error state and return.
4. Dispatch `{ type: 'SET_NAME', name: trimmedValue }`.

### 5.3. Component test for `NamingForm`

In `tests/components/NamingForm.test.tsx`:

- **Renders the form with heading, input, and Confirm button**: assert all three are present.
- **Empty submit shows error**: submit with empty input, assert `"Name must be 1-24 characters"` is visible, assert `dispatch` was not called.
- **Whitespace-only submit shows error**: submit with `"   "`, assert error visible, assert `dispatch` not called.
- **25-char submit shows error**: submit with a 25-character string, assert error visible.
- **Valid submit dispatches SET_NAME**: submit with `"Pixel"`, assert `dispatch` called with `{ type: 'SET_NAME', name: 'Pixel' }`.
- **Trimming**: submit with `"  Pixel  "`, assert `dispatch` called with `{ type: 'SET_NAME', name: 'Pixel' }` (trimmed).
- **Name gate render test**: render `<TamagotchiProvider>` with `state.name === ''`; assert the naming form is present. Render with `state.name === 'Pixel'`; assert the naming form is absent. This test catches the silent break where someone removes the gate condition from `page.tsx`.

---

## 6. Settings row and Reset button

### 6.1. Add the settings row to `src/app/page.tsx`

Below the pet stage and action buttons, render a small settings row (visible only when `state.name !== ''`):

```tsx
<div className="settings-row">
  <span>{state.name}</span>
  <ResetButton dispatch={dispatch} />
</div>
```

### 6.2. Create `src/components/ResetButton.tsx`

Props: `{ dispatch: Dispatch<Action> }`.

Renders a `<button type="button">Reset pet</button>`.

On click:

1. Call `window.confirm('Reset your pet? This cannot be undone.')`.
2. If the return value is `true`, dispatch `{ type: 'RESET' }`.
3. If the return value is `false`, do nothing.

### 6.3. Component test for `ResetButton`

In `tests/components/ResetButton.test.tsx`:

- **Confirm OK dispatches RESET**: mock `window.confirm` to return `true`, click the button, assert `dispatch` called with `{ type: 'RESET' }`.
- **Confirm Cancel does not dispatch**: mock `window.confirm` to return `false`, click the button, assert `dispatch` not called.

### 6.4. Integration test for the full Reset flow

In `tests/integration/persistence.test.tsx`:

**Reset clears storage and shows naming form:**

- Setup: write a stored state with `name: 'Pixel'`. Render the full page. Assert the naming form is absent and the pet UI is visible.
- Mock `window.confirm` to return `true`. Click the "Reset pet" button.
- Assert: `localStorage.getItem('tiny-tamagotchi:v1')` is `null` (storage cleared). Assert the naming form is now visible. This test catches the silent break where someone forgets to call `storage.clear()` on RESET.

---

## 7. Browser verification script

### 7.1. Create `tests/browser/phase5_verify.py`

Implements the checks defined in `validation.md §Browser verification`. The script uses Playwright's sync API, matching the style of `tests/browser/phase3_verify.py`.

Checks:

1. **Baseline**: navigate to `http://localhost:3000`, `wait_for_load_state('networkidle')`, screenshot `/tmp/phase-5-initial.png`.
2. **Naming form gate**: assert the naming form is present (heading `"Name your pet"`, input, Confirm button). Assert no pet sprite, no stat bars, no action buttons are visible.
3. **Name validation**: submit empty input, assert error `"Name must be 1-24 characters"` is visible. Submit a 25-char string, assert error visible. Submit `"Pixel"`, assert the naming form disappears and the pet UI appears.
4. **Persistence across reload**: reload the page, assert the naming form is absent and the pet's name `"Pixel"` is displayed.
5. **Offline catch-up**: manipulate `localStorage` via `page.evaluate` to set `lastTickAt` to `Date.now() - 60_000` (1 minute ago) and `vitals.hunger` to `80`. Reload. Assert `vitals.hunger` is lower than `80` (decay applied).
6. **Reset flow**: click "Reset pet", handle the native `confirm` dialog (Playwright's `page.on('dialog', ...)` handler accepts it), assert the naming form reappears and `localStorage.getItem('tiny-tamagotchi:v1')` is `null`.
7. **Console audit**: zero errors, zero warnings, zero `pageerror` events.
8. **Final screenshot**: `/tmp/phase-5-final.png`.

---

## 8. Full green-bar verification

### 8.1. Run the full suite

```
pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build
```

All commands exit 0.

### 8.2. Confirm test additions

New tests added vs Phase 4:

- `tests/game/reducer.test.ts`: `TICK.lastTickAt`, `RESET` atomicity, `SET_NAME`, `__HYDRATE__` branches.
- `tests/game/storage.test.ts`: 6 new tests (write/read round-trip, key check, clear, corrupt JSON, version mismatch, isAvailable).
- `tests/components/NamingForm.test.tsx`: 7 new tests.
- `tests/components/ResetButton.test.tsx`: 2 new tests.
- `tests/integration/persistence.test.tsx`: 7 new tests (read on mount, write on dispatch, clear on name-empty, catch-up under cap, catch-up over cap, name gate render, full Reset flow).

Total new test count: at least 23 tests above Phase 4's baseline.

### 8.3. Update `CHANGELOG.md`

Add Phase 5 bullets before merging.

---

## Suggested commit breakdown

- `feat(phase-5): add MAX_OFFLINE_MS constant; extend PetModel with name and lastTickAt`
- `feat(phase-5): add RESET, SET_NAME, __HYDRATE__ actions; update TICK to carry nowMs`
- `feat(phase-5): extend reducer with RESET, SET_NAME, __HYDRATE__ branches; set lastTickAt on TICK`
- `feat(phase-5): create storage adapter (read/write/clear/isAvailable) with versioned schema`
- `feat(phase-5): add hydration and write-on-change effects to TamagotchiProvider`
- `feat(phase-5): add NamingForm component and name gate in page.tsx`
- `feat(phase-5): add ResetButton component and settings row in page.tsx`
- `test(phase-5): add storage adapter tests, NamingForm tests, ResetButton tests, and persistence integration tests`
- `test(phase-5): add phase5_verify.py browser verification script`
- `docs(phase-5): record phase 5 in changelog`
