# Phase 4 — Dynamic States & Heal: Validation

## Automated

Run from `tiny-tamagotchi/`. Every command must exit with code 0.

| Command             | Must produce                                                                                                                                                                                                                                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`         | Zero errors, zero warnings.                                                                                                                                                                                                                                                                                                                  |
| `pnpm typecheck`    | `tsc --noEmit` passes.                                                                                                                                                                                                                                                                                                                       |
| `pnpm format:check` | Prettier reports all files formatted.                                                                                                                                                                                                                                                                                                        |
| `pnpm test`         | All prior tests still pass plus new reducer HEAL branches, `states.ts` unit tests, per-state Pet tests, HealButton lifecycle tests, StateAnnouncer tests, atomic Normal→Sick / Normal→Evolved / Evolved→Sick transition tests, forbidden-transition assertions, and the state-machine integration test. Suite ≥65 tests. Zero skipped.       |
| `pnpm build`        | Next.js production build succeeds.                                                                                                                                                                                                                                                                                                           |

### Specific assertions

- `src/game/state.ts` exports `PetState = 'Normal' \| 'Sick' \| 'Evolved'`; `PetModel` includes `state: PetState`, `hasEvolved: boolean`, `neglectTicks: { hunger: number; happiness: number; energy: number }`, `careTicks: number`. `initialState.state === 'Normal'`, `initialState.hasEvolved === false`.
- `Action` union equals `FEED | PLAY | REST | HEAL | TICK`. No `RESET`.
- `src/game/constants.ts` exports `SICK_VITAL_THRESHOLD = 10`, `SICK_NEGLECT_TICKS = 10`, `EVOLVE_VITAL_THRESHOLD = 70`, `EVOLVE_CARE_TICKS = 60`, `HEAL_SAFE_BAND = 50`.
- `src/game/states.ts` exists and exports a pure `nextState()` function. A test asserts `nextState` does **not** call `Date.now()` or `Math.random()` (verified by spying on both).
- **State machine is the only writer of `state`**: a test greps `src/game/reducer.ts` and asserts `state:` is assigned in the reducer only in the `HEAL` branch (direct) and via the return of `states.nextState()` (everywhere else). The grep is a literal-source check; it catches a future edit that writes `state: 'Normal'` somewhere new.
- **Atomic Normal→Sick**: starting from `{ hunger: 8, happiness: 50, energy: 50, neglectTicks.hunger: SICK_NEGLECT_TICKS - 1, state: 'Normal' }`, a single `TICK` dispatch returns a state object satisfying `state === 'Sick'` **and** `neglectTicks.hunger >= SICK_NEGLECT_TICKS` on one return value.
- **Atomic Evolved→Sick** (one of the four allowed transitions): same setup with `state: 'Evolved', hasEvolved: true`; single TICK returns `state === 'Sick'` **and** `hasEvolved === true` on one object.
- **Atomic Normal→Evolved**: starting from `{ hunger: 80, happiness: 80, energy: 80, careTicks: EVOLVE_CARE_TICKS - 1, state: 'Normal', hasEvolved: false }`, a single `TICK` dispatch returns a state satisfying `state === 'Evolved'` **and** `hasEvolved === true` on one object.
- **HEAL outside Sick is identity**: from `Normal` and from `Evolved`, `reducer(s, { type: 'HEAL' })` returns `s` by reference.
- **HEAL inside Sick**: clamps vitals `<50` up to 50, leaves `>=50` untouched, resets all counters to 0, and transitions `state` to `hasEvolved ? 'Evolved' : 'Normal'`.
- **hasEvolved is one-way**: `hasEvolved === true` implies every subsequent reducer output has `hasEvolved === true`, across 200+ randomized dispatches (property test).
- **Evolved does not re-evolve**: from `{ state: 'Evolved', hasEvolved: true }` with all vitals at 100, `careTicks` stays at 0 across many TICKs (no Re-Evolution loop).
- **Rest pauses counters**: from `{ hunger: 5, neglectTicks.hunger: 3, isResting: true }`, after N>1 TICKs, `neglectTicks.hunger === 3` (unchanged) and Hunger stays unchanged. Same for `careTicks` from a resting high-vitals state.
- `<Pet />` root `<svg>` has `data-state` equal to the current `state.state`. Regex-matched `pet` CSS Module class is still applied in all three states (linkage survives refactor).
- `<Pet />` `aria-label` matches `/tiny tamagotchi, (idling|sick|thriving)/i` based on state.
- `data-testid="crown"` is in the DOM **only** when `state === 'Evolved'`.
- `data-testid="sick-indicator"` is in the DOM **only** when `state === 'Sick'`.
- `<HealButton />` renders no DOM node when `state !== 'Sick'`, and renders exactly one enabled `<button>Heal</button>` when `state === 'Sick'`.
- `<StateAnnouncer />` has `role="status"`, `aria-live="polite"`; text content is empty on initial mount and becomes `Pet is now Sick`, `Pet is now Normal`, `Pet is now Evolved` on the appropriate transitions.
- No new dependencies in `package.json`. No references to `localStorage`, no `RESET` action, no fourth state string.

## Manual

### Walkthrough (`pnpm dev`, then production cross-check with `pnpm build && pnpm start`)

1. Open `/`: all three bars at 100, state Normal. Pet colored in the Normal palette, no crown, no `•••` marker. HealButton absent. Announcer empty.
2. Spam Play until Energy < 10, then keep Rest off. Wait ~30 s: screen reader announces "Pet is now Sick", the pet recolors, `•••` appears, HealButton shows at the end of the button row.
3. Click **Heal**: pet returns to Normal colors, `•••` vanishes, HealButton disappears, vitals `<50` rise to 50. Announcer: "Pet is now Normal".
4. Starting fresh: rotate Feed/Play/Rest so all three vitals stay ≥70. Wait ~3 min. State announces "Pet is now Evolved", crown appears in the pet, palette warms.
5. After Evolving, force a neglect cycle (spam Play, skip Rest) to ≤10 for 30 s. Announcer: "Pet is now Sick". HealButton appears. Click Heal: crown is back, state announces "Pet is now Evolved" (not Normal).
6. Try to Heal when not Sick (manually dispatch via devtools): no effect on state or vitals.

### Behavior

- No console errors or React warnings.
- Button row order is always Feed, Play, Rest, [Heal?] — Heal is strictly last when present.
- Pet colors change only at state transition boundaries (no flicker on every TICK).
- Announcer text does not fire on initial mount (no false "Pet is now Normal" on load).

### Accessibility

- Each StatBar announces as `progressbar` (unchanged).
- Each enabled action button is keyboard reachable. HealButton is reachable via Tab when it renders.
- `prefers-reduced-motion: reduce` still stops the idle bob; state recoloring does not introduce motion.
- `role="status"` announcer fires politely (does not interrupt ongoing speech).

### Edge cases

- A vital briefly dipping to 10 and recovering before 30 s elapses does **not** trigger Sick (counter resets on recovery).
- A pet that is already Sick whose vitals drop further stays Sick — no escalated state.
- Rest mid-neglect: the counter pauses. Entering Rest at neglectTicks=9, resting for 10 ticks, then Waking with Hunger still low: after one more awake TICK the counter reaches 10 → Sick (pause preserved, not reset).
- HEAL from Evolved-then-Sick returns directly to Evolved, never Normal.
- Dispatching 200 random actions never produces a `PetState` outside `{ Normal, Sick, Evolved }` (property test).

### Browser verification (webapp-testing skill)

Run **after** the automated suite passes and **before** merging.

Load the skill and run `scripts/with_server.py --server "pnpm start" --port 3000 -- python3 tests/browser/phase4_verify.py`. The script performs:

1. **Baseline**: navigate to `/`, `wait_for_load_state('networkidle')`, assert initial `data-state="Normal"` on the pet SVG, no crown, no `•••`, no Heal button. Screenshot `/tmp/phase-4-normal.png`.
2. **Aria-label per state**: assert initial `aria-label` matches `/idling/i`.
3. **Drive to Sick**: click Play until Energy < 10, then wait `SICK_NEGLECT_TICKS * TICK_INTERVAL_MS * 1.2` ms without clicking Rest. Assert pet's `data-state` flips to `"Sick"`, `•••` indicator appears, HealButton is visible, and `<div data-testid="state-announcer">` text equals `Pet is now Sick`. Screenshot `/tmp/phase-4-sick.png`.
4. **HEAL atomicity**: click Heal. Assert the DOM transitions from `Sick + HealButton visible` to `Normal + HealButton absent` within one animation frame (poll `data-state` and HealButton `.count()` together via `page.wait_for_function`; the function returns true when both flip). Assert Hunger/Happiness/Energy aria-valuenow are all `>=50`.
5. **Drive to Evolved (accelerated harness)**: Phase 4 ships three querystring seeds (documented in `plan.md §10`) that preload the pet into near-transition states. Navigate with `?__seed=evolve-near`, wait one tick, assert `data-state="Evolved"`, crown present, announcer text `Pet is now Evolved`.
6. **Evolved → Sick → Heal → Evolved**: navigate with `?__seed=evolved-near-sick` (preloads Hunger=5, `neglectTicks.hunger = SICK_NEGLECT_TICKS - 1`, `state: 'Evolved'`, `hasEvolved: true`). Wait one tick → Sick. Click Heal → assert `data-state="Evolved"` (crown is back; state is **not** Normal).
7. **hasEvolved one-way**: with the same evolved context, click Heal while Sick, then drive more neglect cycles; assert the crown returns every Heal and never reappears as a "first evolution" path — ensures `hasEvolved` is persisted correctly inside the pet model.
8. **Keyboard a11y**: tab through the page when Sick; assert HealButton is focusable. Tab through when not Sick; assert HealButton is not in the Tab order (because it's not rendered).
9. **Console audit**: zero errors, zero warnings, zero `pageerror` events across all navigations.
10. **Final screenshots**: `/tmp/phase-4-evolved.png`, `/tmp/phase-4-final.png`.

A passing run of this script is the gate for merging Phase 4.

## Tone check

New copy:

- Button label: `"Heal"` (title case, single word).
- Announcer: `"Pet is now Normal"`, `"Pet is now Sick"`, `"Pet is now Evolved"` (exact strings; title case on state, sentence case on lead; no trailing punctuation).
- No new disabled-reason strings.
- No emoji, no marketing voice, no toast copy.

## Scope Contract check

Confirm Phase 4 introduced **nothing** from the 🚫 list in `mission.md`:

- No auth, users, accounts.
- No multi-pet data, inventories, currencies.
- No notifications APIs, mini-games, social features.
- No admin routes or debug UI. The `?__seed=` URL handler is a test harness that accepts only three hard-coded preset names and renders no UI surface of its own; it is not an admin feature.
- No permadeath (Sick is always recoverable via HEAL).
- No fourth state, no reversible evolution, no chained evolution.
- No persistence, no naming (reserved for Phase 5).

If any of the above appears in the diff, **fail** validation and remove it.

## Definition of Done

Phase 4 is complete when **all** of the following are true:

- [ ] Branch `phase-4-dynamic-states-heal` contains only Phase 4 commits.
- [ ] Every command in the **Automated** table exits 0 on a fresh clone.
- [ ] Every **Specific assertion** holds true.
- [ ] The **Manual walkthrough** matches exactly.
- [ ] **Tone check** passes.
- [ ] **Browser verification via `webapp-testing` skill** ran clean: per-state visuals, atomic Heal, Evolved→Sick→Heal→Evolved, keyboard a11y, zero console errors.
- [ ] **Scope Contract check** passes.
- [ ] `CHANGELOG.md` has new bullets summarizing Phase 4.
- [ ] No TODO/FIXME comments in the diff.
- [ ] `specs/roadmap.md` Phase 4 deliverables can honestly be ticked.
