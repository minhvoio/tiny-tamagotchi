# Phase 5 — Persistence, Naming & Real-Time Aging: Validation

## Automated

Run from `tiny-tamagotchi/`. Every command must exit with code 0.

| Command             | Must produce                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm lint`         | Zero errors, zero warnings.                                                                                                                                                                      |
| `pnpm typecheck`    | `tsc --noEmit` passes.                                                                                                                                                                           |
| `pnpm format:check` | Prettier reports all files formatted.                                                                                                                                                            |
| `pnpm test`         | All prior tests still pass plus Phase 5 reducer branches, storage adapter tests, NamingForm and ResetButton component tests, and the persistence integration tests. Zero failures, zero skipped. |
| `pnpm build`        | Next.js production build succeeds.                                                                                                                                                               |

### Specific assertions

**Types and constants:**

- `src/game/state.ts` `PetModel` has `name: string` and `lastTickAt: number` in addition to all Phase 4 fields.
- `src/game/state.ts` `Action` union includes `FEED | PLAY | REST | HEAL | TICK | RESET | SET_NAME | __HYDRATE__`.
- `src/game/state.ts` `TICK` action shape is `{ type: 'TICK'; elapsedMs: number; nowMs: number }`.
- `src/game/constants.ts` exports `MAX_OFFLINE_MS` equal to `8 * 60 * 60 * 1000`.
- `initialState.name === ''` and `initialState.lastTickAt === 0`.

**Reducer:**

- `TICK` branch sets `lastTickAt` to `action.nowMs` on the returned state. A dedicated test dispatches `{ type: 'TICK', elapsedMs: TICK_INTERVAL_MS, nowMs: 12345678 }` and asserts `result.lastTickAt === 12345678`.
- `RESET` atomicity: a single `{ type: 'RESET' }` dispatch from a fully degraded state returns a state where `name === ''` AND `vitals.hunger === MAX_STAT` AND `vitals.happiness === MAX_STAT` AND `vitals.energy === MAX_STAT` AND `state === 'Normal'` AND `hasEvolved === false` AND `neglectTicks === 0` AND `careTicks === 0` AND `lastTickAt === 0` AND `isResting === false`. All fields asserted on one returned object, not across multiple dispatches.
- `SET_NAME` sets `state.name` to the provided string and leaves all other fields unchanged.
- `__HYDRATE__` returns `action.state` directly.
- No `Date.now()` calls inside `src/game/reducer.ts` (grep confirms zero hits).

**Storage adapter:**

- `src/game/storage.ts` exports `read`, `write`, `clear`, `isAvailable` and no other symbols.
- `write(state)` stores a JSON string at key `'tiny-tamagotchi:v1'` that includes `version: 1`.
- `read()` after `write(state)` returns an object matching `state` field-by-field.
- `clear()` after `write(state)` results in `localStorage.getItem('tiny-tamagotchi:v1') === null`.
- `read()` when the stored value is `'{bad json}'` returns `null` and does not throw.
- `read()` when the stored value has `version: 99` returns `null`.
- `isAvailable()` returns `true` in the jsdom test environment.
- `src/game/storage.ts` has no imports from `react`, `next`, or any hook file.

**Provider hydration and write-on-change:**

- `TamagotchiProvider` calls `storage.read()` exactly once on mount (spy assertion).
- After any dispatch when `state.name !== ''`, `storage.write` is called with the updated state (spy assertion). This assertion catches the silent break where someone removes the write-on-change `useEffect`.
- When `state.name === ''`, `storage.clear` is called (spy assertion). This assertion catches the silent break where someone forgets to call `storage.clear()` on RESET.
- Offline catch-up with `elapsedMs < MAX_OFFLINE_MS`: hydration produces one state object where `vitals`, `neglectTicks`, and `state` reflect the catch-up, and `lastTickAt` equals the value passed as `nowMs` in the catch-up TICK. A single `__HYDRATE__` dispatch followed by a single `TICK` dispatch, not more.
- Offline catch-up with `elapsedMs > MAX_OFFLINE_MS`: the catch-up TICK is dispatched with `elapsedMs === MAX_OFFLINE_MS` (not the raw elapsed time). This assertion catches the silent break where someone changes `MAX_OFFLINE_MS` to `Infinity`.

**Naming form:**

- When `state.name === ''`, `src/app/page.tsx` renders the naming form and does not render any pet sprite, stat bar, or action button.
- When `state.name !== ''`, the naming form is absent.
- A render test asserts the naming form is present when `state.name === ''` regardless of the values of other state fields (e.g., even if `state.state === 'Evolved'`). This assertion catches the silent break where someone removes the name-required gate from `page.tsx`.
- Submitting the form with an empty string does not call `dispatch` and shows `"Name must be 1-24 characters"`.
- Submitting the form with a 25-character string does not call `dispatch` and shows `"Name must be 1-24 characters"`.
- Submitting the form with `"  Pixel  "` calls `dispatch` with `{ type: 'SET_NAME', name: 'Pixel' }` (trimmed).

**Reset flow:**

- `ResetButton` calls `window.confirm('Reset your pet? This cannot be undone.')` on click.
- When `window.confirm` returns `true`, `dispatch` is called with `{ type: 'RESET' }`.
- When `window.confirm` returns `false`, `dispatch` is not called.
- Integration test: after clicking Reset and confirming, `localStorage.getItem('tiny-tamagotchi:v1')` is `null` and the naming form is visible. This assertion catches the silent break where someone forgets to call `storage.clear()` on RESET.

**No regressions:**

- All Phase 4 reducer tests (state machine transitions, HEAL, neglect/care counters) still pass.
- `src/game/reducer.ts` has no imports from `react`, `next`, or any hook file.
- No new runtime dependencies in `package.json`.

---

## Manual

### Walkthrough

1. Clear `localStorage` for `localhost:3000` in devtools. Run `pnpm build && pnpm start`.
2. Navigate to `http://localhost:3000`. The naming form appears: heading `"Name your pet"`, a text input, and a `"Confirm"` button. No pet, no bars, no action buttons.
3. Submit the form with an empty input. The error `"Name must be 1-24 characters"` appears inline. The form stays.
4. Submit with a 25-character string. The same error appears.
5. Type `"Pixel"` and click `"Confirm"`. The naming form disappears. The pet UI appears: pet sprite, three stat bars, action buttons, and a settings row showing `"Pixel"` and a `"Reset pet"` button.
6. Wait 10 seconds. Vitals decay. Interact with Feed, Play, Rest to confirm the care loop still works.
7. Close the tab. Wait at least 30 seconds. Reopen `http://localhost:3000`. The naming form does not appear. The pet's name `"Pixel"` is shown. Vitals reflect the time away (lower than when the tab was closed).
8. Open devtools, set `lastTickAt` in `localStorage` to `Date.now() - 10 * 24 * 60 * 60 * 1000` (10 days ago). Reload. The pet may be Sick (neglect accumulated) but is not dead. Vitals reflect at most 8 hours of decay, not 10 days.
9. Click `"Reset pet"`. A native browser confirm dialog appears with the message `"Reset your pet? This cannot be undone."`. Click `"Cancel"`. Nothing changes.
10. Click `"Reset pet"` again. Click `"OK"` in the confirm dialog. The naming form reappears. `localStorage` is empty (confirm in devtools).
11. `pnpm build && pnpm start` shows identical behavior.

### Behavior

- No console errors or React warnings at any step.
- Numeric readouts always show integers.
- The naming form is the only thing rendered when `state.name === ''`. No partial pet UI leaks through.
- The settings row (name display + Reset button) is visible only when `state.name !== ''`.
- After Reset, the naming form appears immediately without a page reload.

### Accessibility

- The naming form's input has an associated `<label>` (via `htmlFor`). Screen readers announce the label when the input is focused.
- The `"Confirm"` button is reachable by keyboard. Enter submits the form.
- The inline error message is associated with the input via `aria-describedby` so screen readers announce it on validation failure.
- The `"Reset pet"` button is keyboard reachable. The native `confirm()` dialog is natively accessible.
- All Phase 3 and Phase 4 accessibility properties (progressbar roles, aria-valuenow, aria-disabled on action buttons) remain intact.

### Edge cases

- **Corrupt localStorage**: manually set `localStorage['tiny-tamagotchi:v1'] = '{bad'` in devtools, then reload. The naming form appears (treat-as-no-pet). No crash, no error in the console.
- **Version mismatch**: manually set `localStorage['tiny-tamagotchi:v1'] = JSON.stringify({ version: 99, name: 'x' })`, then reload. The naming form appears. No crash.
- **Name at exactly 24 characters**: submit a 24-character name. It is accepted. No error shown.
- **Name at exactly 1 character**: submit a single character. It is accepted.
- **Tab closed for more than 8 hours**: vitals reflect exactly 8 hours of decay, not more. The pet may be Sick but is alive.
- **Reset while pet is Sick**: the Reset flow works identically regardless of the pet's current state. After Reset, the pet starts fresh at Normal with all vitals at 100.
- **Rapid dispatches after naming**: submitting the name and immediately clicking Feed does not cause a race condition. The write-on-change effect fires after each state update.

### Browser verification (webapp-testing skill)

Run **after** the automated suite passes and **before** merging. Phase 5 introduces localStorage interactions, a blocking form, a native confirm dialog, and cross-reload state persistence. jsdom's integration tests cover the logic, but only a real browser proves that `localStorage` persists across page loads, that the native `confirm()` dialog fires correctly, and that the naming form gate works end-to-end.

Load the skill and run `scripts/with_server.py --server "pnpm start" --port 3000 -- python phase5_verify.py`. The script performs:

1. **Baseline**: clear `localStorage` via `page.evaluate(() => localStorage.clear())`. Navigate to `http://localhost:3000`, `wait_for_load_state('networkidle')`, screenshot `/tmp/phase-5-initial.png`.
2. **Naming form gate**: assert the heading `"Name your pet"` is visible. Assert no `role=progressbar` elements exist. Assert no `role=button` elements with text `"Feed"`, `"Play"`, or `"Rest"` exist.
3. **Name validation**: fill the input with an empty string and click `"Confirm"`. Assert `"Name must be 1-24 characters"` is visible. Fill with a 25-character string and click `"Confirm"`. Assert the error is still visible. Fill with `"Pixel"` and click `"Confirm"`. Assert the naming form disappears and `role=progressbar` elements appear.
4. **Persistence across reload**: reload the page. Assert the naming form is absent. Assert the text `"Pixel"` is visible in the settings row. Assert `role=progressbar` elements are present.
5. **Offline catch-up**: via `page.evaluate`, read the current `localStorage` value, parse it, set `lastTickAt` to `Date.now() - 60_000` and `vitals.hunger` to `80`, write it back. Reload. Assert `vitals.hunger` (read from `aria-valuenow` on the Hunger progressbar) is less than `80`.
6. **Offline cap**: via `page.evaluate`, set `lastTickAt` to `Date.now() - 10 * 24 * 60 * 60 * 1000` (10 days ago). Reload. Assert the pet is alive (naming form absent, pet UI visible). Assert `vitals.hunger` is not `0` in a way that would only be possible with more than 8 hours of decay (i.e., the cap is enforced). Specifically: compute the expected hunger after exactly 8 hours of decay and assert the actual value is within 1 unit of that expected value.
7. **Reset flow**: register a `page.on('dialog', lambda d: d.accept())` handler. Click `"Reset pet"`. Assert the naming form reappears. Assert `page.evaluate(() => localStorage.getItem('tiny-tamagotchi:v1'))` returns `null`.
8. **Console audit**: zero errors, zero warnings, zero `pageerror` events throughout.
9. **Final screenshot**: `/tmp/phase-5-final.png`.

A passing run of this script is the gate for merging Phase 5.

---

## Tone check

New user-facing strings introduced in Phase 5:

- `"Name your pet"` (form heading)
- `"Enter a name"` (input placeholder)
- `"Confirm"` (submit button)
- `"Name must be 1-24 characters"` (inline error)
- `"Reset pet"` (settings row button)
- `"Reset your pet? This cannot be undone."` (native confirm dialog)

Rules:

- Sentence case on headings and error messages. Title case on button labels.
- No emoji. No marketing voice. No filler words.
- No additional copy beyond this list. No toasts, no success banners, no loading spinners.

---

## Scope Contract check

Confirm Phase 5 introduced **nothing** from the 🚫 list in `mission.md`:

- No auth, users, accounts.
- No multi-pet data, inventories, currencies.
- No notifications APIs, mini-games, social features.
- No admin routes or debug UI.
- No permadeath. Offline catch-up can make the pet Sick but never ends it. Reset is the only way a pet ends, and it requires explicit confirmation.
- No Sick/Evolved logic changes (state machine from Phase 4 is unchanged).
- No Easter eggs, idle animation variants, personality hash (reserved for Phase 6).
- No sound, focus-visible pass, responsive layout, mobile verification (reserved for Phase 7).
- No IndexedDB, server sync, or schema migrations.
- No multiple pets. Exactly one pet per browser.

If any of the above appears in the diff, **fail** validation and remove it.

---

## Definition of Done

Phase 5 is complete when **all** of the following are true:

- [ ] Branch `phase-5-persistence-naming-aging` contains only Phase 5 commits.
- [ ] Every command in the **Automated** table exits 0 on a fresh clone.
- [ ] Every **Specific assertion** holds true.
- [ ] The **Manual walkthrough** matches exactly, including corrupt-JSON recovery, offline cap, and Reset flow.
- [ ] **Tone check** passes: all six strings match verbatim, no additional copy introduced.
- [ ] **Browser verification via `webapp-testing` skill** ran clean: naming form gate, name validation, persistence across reload, offline catch-up, offline cap, Reset flow, zero console errors.
- [ ] **Scope Contract check** passes.
- [ ] `CHANGELOG.md` has new bullets summarizing Phase 5 deliverables.
- [ ] No TODO/FIXME comments left in the diff.
- [ ] `specs/roadmap.md` Phase 5 deliverables can honestly be ticked.
