# Phase 5 — Persistence, Naming & Real-Time Aging: Requirements

## Scope

Phase 5 makes the pet permanent. After this phase, closing and reopening the browser tab restores the exact pet the player left, including its name, vitals, state, and the time that passed while the tab was closed. A blocking naming prompt gates the entire app on first load. A Reset button with a native confirmation dialog is the only way to end a pet and start fresh.

Phase 5 assumes Phase 4 has merged to main before implementation begins. `PetModel` therefore already includes `state: PetState`, `hasEvolved: boolean`, `neglectTicks: number`, and `careTicks: number` from Phase 4. Phase 5 adds `name: string` and `lastTickAt: number` to that shape.

### In Scope

| Area                       | What ships                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PetModel shape**         | `name: string` added (empty string = not yet named). `lastTickAt: number` added (epoch ms; 0 in `initialState`, set to `Date.now()` on first save). Both fields are part of the canonical `PetModel` in `src/game/state.ts`.                                                                                                                                                                                                                                                                                                                                        |
| **Action union**           | `RESET` action introduced. Full union after Phase 5: `FEED \| PLAY \| REST \| HEAL \| TICK \| RESET`. `TICK` action gains a second field: `{ type: 'TICK'; elapsedMs: number; nowMs: number }`.                                                                                                                                                                                                                                                                                                                                                                     |
| **RESET reducer branch**   | Returns `initialState` merged with `{ name: '' }`. All vitals reset to `MAX_STAT`, `state` to `'Normal'`, `hasEvolved` to `false`, `isResting` to `false`, all counters to `0`, `lastTickAt` to `0`. This is a single reducer return, not a sequence of dispatches.                                                                                                                                                                                                                                                                                                 |
| **lastTickAt bookkeeping** | The reducer sets `next.lastTickAt = action.nowMs` on every `TICK` dispatch. The reducer does not call `Date.now()`. The Provider passes `Date.now()` into the `TICK` action as `nowMs`.                                                                                                                                                                                                                                                                                                                                                                             |
| **Storage adapter**        | `src/game/storage.ts` exports four pure functions: `read()`, `write(state: PetModel)`, `clear()`, `isAvailable()`. Single storage key `'tiny-tamagotchi:v1'`. Schema version field `version: 1` is written on every `write()` call.                                                                                                                                                                                                                                                                                                                                 |
| **Versioned schema**       | `{ version: 1, name: string, vitals: Vitals, state: PetState, hasEvolved: boolean, isResting: boolean, neglectTicks: number, careTicks: number, lastTickAt: number }`. Corrupt or unparseable JSON returns `null` from `read()` (no throw). Version mismatch (stored version !== 1) also returns `null`.                                                                                                                                                                                                                                                            |
| **Hydration on mount**     | `TamagotchiProvider` calls `storage.read()` on mount. If the result is non-null and `result.name` is non-empty, the Provider initializes state from the stored value and dispatches a single catch-up `TICK` with `elapsedMs = Math.max(0, Math.min(Date.now() - result.lastTickAt, MAX_OFFLINE_MS))` and `nowMs = Date.now()`. If `read()` returns `null` or `result.name` is empty, the Provider starts from `initialState` (naming prompt shown).                                                                                                                |
| **Offline catch-up cap**   | `MAX_OFFLINE_MS = 8 * 60 * 60 * 1000` (8 hours). Exported from `src/game/constants.ts`. Elapsed time beyond 8 hours is clamped to exactly `MAX_OFFLINE_MS` before the catch-up `TICK` is dispatched. Catch-up can drive the pet to `Sick` (neglect counters accumulate) but never into any terminal state (no permadeath, per mission.md).                                                                                                                                                                                                                          |
| **Write-on-change**        | `TamagotchiProvider` has a `useEffect` that calls `storage.write(state)` whenever `state` changes and `state.name` is non-empty. When `state.name === ''`, the effect calls `storage.clear()` instead (this is the side effect that clears storage after a RESET dispatch).                                                                                                                                                                                                                                                                                         |
| **Naming flow**            | `src/app/page.tsx` renders a blocking inline form when `state.name === ''`. The form contains a single text input and a "Confirm" button. No pet sprite, no stat bars, no action buttons are rendered while the name is empty. The form re-renders on every load where no stored name exists. It is not a `<dialog>` element and not a header inline upgrade.                                                                                                                                                                                                       |
| **Name validation**        | On submit: trim the input value. Reject if the trimmed value is empty. Reject if the trimmed value is longer than 24 characters. On rejection, render an inline error message: `"Name must be 1-24 characters"`. On acceptance, dispatch a `SET_NAME` action... No. Name is set by dispatching `RESET` is not right either. Name is set by a dedicated `SET_NAME` action: `{ type: 'SET_NAME'; name: string }`. The reducer sets `state.name = action.name` (trimmed, validated before dispatch). `SET_NAME` is added to the action union.                          |
| **Action union (final)**   | `FEED \| PLAY \| REST \| HEAL \| TICK \| RESET \| SET_NAME`. `SET_NAME` is introduced in Phase 5 only.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Reset flow**             | A "Reset pet" button rendered in a small settings row below the pet stage (visible only when `state.name !== ''`). Clicking calls `window.confirm('Reset your pet? This cannot be undone.')`. On OK (return value `true`), dispatches `{ type: 'RESET' }`. The Provider's write-on-change effect then calls `storage.clear()` because `state.name === ''` after the RESET. The page re-renders the naming prompt.                                                                                                                                                   |
| **Storage adapter tests**  | `tests/game/storage.test.ts` covers: `write()` puts a JSON string at key `'tiny-tamagotchi:v1'`; `read()` returns the written value; `clear()` removes the key; corrupt JSON returns `null`; version mismatch returns `null`; `isAvailable()` returns `true` in jsdom.                                                                                                                                                                                                                                                                                              |
| **Reducer tests**          | `tests/game/reducer.test.ts` gains: `TICK` sets `lastTickAt` to `action.nowMs`; `RESET` returns a state where `name === ''` and all vitals are `MAX_STAT` and `state === 'Normal'` and `hasEvolved === false` and all counters are `0` in one reducer call; `SET_NAME` sets `state.name` to the provided string.                                                                                                                                                                                                                                                    |
| **Integration tests**      | `tests/integration/persistence.test.tsx` covers: Provider calls `storage.read()` on mount; Provider calls `storage.write()` after a dispatch when `name` is non-empty; Provider calls `storage.clear()` when `state.name === ''`; naming form is present when `state.name === ''`; naming form is absent when `state.name !== ''`; Reset button dispatches RESET and storage is cleared; offline catch-up with `elapsedMs < MAX_OFFLINE_MS` produces correct vitals in one dispatch; offline catch-up with `elapsedMs > MAX_OFFLINE_MS` clamps to `MAX_OFFLINE_MS`. |
| \***\*SEED** harness\*\*   | The test-only `__SEED__` harness from Phase 4 stays unchanged. It does not write `name` or `lastTickAt`. The naming form still gates the app on seed runs because `state.name === ''`.                                                                                                                                                                                                                                                                                                                                                                              |
| **CHANGELOG**              | `CHANGELOG.md` updated with Phase 5 bullets before merging.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

### Out of Scope (explicitly deferred)

- Easter eggs, idle animation variants, personality hash derived from the pet's name (Phase 6).
- Sound effects, focus-visible pass, responsive layout, mobile verification (Phase 7).
- Multi-pet flows, per-user storage, any data model beyond one pet per browser.
- IndexedDB, server sync, or any backend persistence.
- Schema migrations. Version mismatch is treated as no-pet; no migration logic ships in Phase 5.
- A dedicated `/settings` route. The Reset button lives inline on the main page.
- `window.confirm` replacement with a custom modal. Native `confirm()` is the locked choice.
- Personality-driven stat tuning or animation variants based on the pet's name.

### Non-negotiables (Scope Contract from `mission.md`)

- No permadeath. Offline catch-up can make the pet Sick but never ends it.
- Exactly one pet per browser. No multi-pet data structures.
- No authentication, no user accounts, no server-side state.
- No notifications, mini-games, social features, currencies, or admin UI.
- All stats remain integer-clamped to `[0, 100]`.
- Reset is the only way a pet ends, and it requires explicit player confirmation.

## Decisions

| Decision                   | Choice                                                                                                     | Why                                                                                                                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Naming UX pattern**      | Blocking inline form in `page.tsx`; no pet rendered until name is saved                                    | Matches the Tamagotchi ritual of naming before meeting the pet. A dialog or header upgrade would let the player see the pet first, which breaks the emotional sequence.                   |
| **Storage key**            | `'tiny-tamagotchi:v1'` (single key, full state blob)                                                       | Simple to read, write, and clear. One key means one atomic write per state change. No partial-state corruption risk from multiple keys.                                                   |
| **Schema version**         | `version: 1` field in the stored JSON; mismatch returns `null`                                             | Lets future phases detect stale data without crashing. Phase 5 does not migrate; it treats mismatches as no-pet.                                                                          |
| **Offline cap**            | `MAX_OFFLINE_MS = 8 * 60 * 60 * 1000` (8 hours)                                                            | Long enough to feel meaningful (overnight absence matters). Short enough that a week-old tab does not produce an extreme state on return. Matches the roadmap's "e.g., max 8 hours" note. |
| **Single catch-up TICK**   | One `TICK` dispatch with the full clamped `elapsedMs` on mount                                             | Keeps hydration deterministic and testable. Multiple dispatches would interleave with React's render cycle and make the initial state unpredictable.                                      |
| **`nowMs` on TICK action** | Provider passes `Date.now()` as `nowMs`; reducer sets `lastTickAt = action.nowMs`                          | Keeps the reducer pure (no `Date.now()` calls inside). Tests can inject a fixed `nowMs` and assert `lastTickAt` exactly.                                                                  |
| **`SET_NAME` action**      | Separate action from `RESET`; sets `state.name` to the trimmed, validated string                           | Keeps the reducer's RESET branch clean (always returns `initialState` shape). Name setting is a distinct user intent from resetting.                                                      |
| **Reset side effect**      | `storage.clear()` is called by the Provider's `useEffect` when `state.name === ''`, not inside the reducer | Keeps the reducer pure. The effect already runs on every state change; the `name === ''` condition is the natural trigger.                                                                |
| **Corrupt JSON handling**  | `read()` wraps `JSON.parse` in try/catch; returns `null` on any error                                      | Prevents a bad localStorage entry from crashing the app. Treat-as-no-pet is the safest recovery.                                                                                          |
| **Name length limit**      | 1 to 24 visible characters (trimmed); all-whitespace rejected                                              | 24 chars fits comfortably in the UI without overflow. Trimming prevents invisible-whitespace-only names.                                                                                  |

## Context

### Tone & conventions

New user-facing strings introduced in Phase 5, listed verbatim:

- Form heading: `"Name your pet"`
- Input placeholder: `"Enter a name"`
- Submit button: `"Confirm"`
- Inline error: `"Name must be 1-24 characters"`
- Settings row label: `"Reset pet"`
- Native confirm dialog message: `"Reset your pet? This cannot be undone."`

Rules: sentence case on headings and error messages, title case on button labels. No emoji. No marketing voice. No filler words.

### Stack pointers

See `specs/tech-stack.md`. Relevant to Phase 5:

- Next.js 14+ App Router; `src/app/page.tsx` is a Client Component (already `'use client'` from Phase 3).
- React 18+ `useReducer` + Context via `TamagotchiProvider` in `src/hooks/useTamagotchi.tsx`.
- TypeScript strict + `noUncheckedIndexedAccess`.
- Vitest + React Testing Library + jsdom for unit and integration tests.
- `localStorage` is the persistence layer. The storage adapter wraps it so the rest of the codebase never calls `localStorage` directly.
- No new runtime dependencies. `@testing-library/user-event` is already present.

### Existing patterns to follow

- **Pure game logic, impure UI.** `src/game/storage.ts` is pure in the sense that it has no React imports. Side effects (calling `storage.write`) live in `useEffect` inside the Provider.
- **One source of truth.** `TamagotchiProvider` owns all state. `storage.ts` is a dumb adapter; it does not hold state.
- **Scope Contract is law.** Do not add HEAL changes, new stats, or any feature from the 🚫 column of `mission.md`.
- **Comments only where they clarify scope-contract constraints.** For example: `// pure: no Date.now() calls; nowMs comes from the Provider`.
- **Reducer branches in action order.** After Phase 5 the order is: `FEED | PLAY | REST | HEAL | TICK | RESET | SET_NAME`.

### Existing file layout (post Phase 4 merged)

- `src/game/state.ts` — `Stat`, `Vitals`, `PetState`, `PetModel` (with `state`, `hasEvolved`, `neglectTicks`, `careTicks`, `isResting`, `vitals`; Phase 5 adds `name`, `lastTickAt`), `Action` union (Phase 5 adds `RESET`, `SET_NAME`, extends `TICK`), `initialState`.
- `src/game/reducer.ts` — handles `FEED | PLAY | REST | HEAL | TICK`; Phase 5 adds `RESET | SET_NAME` branches and updates `TICK` to set `lastTickAt`.
- `src/game/constants.ts` — `MAX_STAT`, `MIN_STAT`, `TICK_INTERVAL_MS`, `DECAY_PER_TICK`, `PLAY_MIN_ENERGY`, `REST_RECOVERY_PER_TICK`, `CARE_AMOUNTS`, Phase 4 thresholds; Phase 5 adds `MAX_OFFLINE_MS`.
- `src/game/states.ts` — state machine transitions (Phase 4); unchanged in Phase 5.
- `src/game/util.ts` — `clamp`; unchanged.
- `src/game/storage.ts` — does not exist yet; Phase 5 creates it.
- `src/hooks/useTamagotchi.tsx` — `TamagotchiProvider`, `useTamagotchi`; Phase 5 adds hydration logic and write-on-change effect.
- `src/hooks/useTick.ts` — drives periodic `TICK` dispatch; Phase 5 updates the dispatched action to include `nowMs: Date.now()`.
- `src/app/page.tsx` — renders the pet UI; Phase 5 adds the naming form gate and the settings row with Reset button.
- `src/components/` — `Pet.tsx`, `PetStage.tsx`, `StatBar.tsx`, `ActionButton.tsx`, `FeedButton.tsx`, `PlayButton.tsx`, `RestButton.tsx`, `HealButton.tsx` (Phase 4).
- `tests/game/reducer.test.ts` — Phase 5 adds `RESET`, `SET_NAME`, and `TICK.lastTickAt` branches.
- `tests/game/storage.test.ts` — does not exist yet; Phase 5 creates it.
- `tests/integration/persistence.test.tsx` — does not exist yet; Phase 5 creates it.
- `tests/browser/phase5_verify.py` — does not exist yet; Phase 5 creates it.

### Open Questions

None. All decisions above were locked before drafting. The §6 rigor pass found no remaining optionality.
