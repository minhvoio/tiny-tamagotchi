# Roadmap

Work is organized as **vertical slices**: each phase ends with a pet the player can see, interact with, and demo. Phases are intentionally small so progress is continuous and reversible.

Each phase lists:

- **Goal** — the one sentence summary
- **Deliverables** — concrete, checkable outputs
- **Demo** — what the player can _do_ at the end
- **Out of Scope** — explicitly deferred

---

## Phase 0 — Project Skeleton

**Goal:** A Next.js app boots and renders "Hello, pet" on localhost.

**Deliverables**

- `tiny-tamagotchi/` Next.js + TypeScript + Tailwind initialized via `pnpm create next-app`.
- ESLint + Prettier + Vitest configured.
- Folder structure from `tech-stack.md` scaffolded (empty files allowed).
- `README.md` with `pnpm dev` / `pnpm test` / `pnpm build` instructions.

**Demo:** `pnpm dev` → a page loads with the app title. Nothing else.

**Out of Scope:** Any game logic, art, or state.

---

## Phase 1 — A Pet on Screen

**Goal:** A visible, idle pet that blinks or bobs. No stats, no interaction.

**Deliverables**

- `<Pet />` component rendering a placeholder sprite (inline SVG or a simple pixel-art PNG).
- A single idle CSS animation (blink or gentle bob).
- Page layout: centered stage with pet + app title.
- Pixel-perfect rendering (`image-rendering: pixelated`).

**Demo:** Player sees a living-looking pet idling on the page.

**Out of Scope:** Stats, actions, multiple sprites, states.

---

## Phase 2 — One Living Vital (Hunger)

**Goal:** Hunger decays over real time on a 0–100 scale; the player can Feed to replenish it.

**Deliverables**

- Game state module (`src/game/state.ts`) with `{ hunger: number /* 0–100 */ }` and action types.
- Reducer handling `FEED` and `TICK` actions; all mutations clamp to `[0, 100]`.
- `useTick` hook driving decay on a `setInterval` (e.g., -1 hunger every N seconds).
- `<StatBar label="Hunger" />` component bound to state, rendering 0–100 visually.
- `<FeedButton />` dispatches `FEED`.
- Vitest tests: feed clamps at 100, tick decays, stat never goes below 0 or above 100.

**Demo:** Hunger bar ticks down from 100; pressing **Feed** refills it. The pet is finally _alive_.

**Out of Scope:** Other stats, sickness, persistence.

---

## Phase 3 — Full Care Loop (Three Vitals + Three Actions)

**Goal:** Hunger, Happiness, Energy all tick on 0–100; Feed, Play, Rest all work with interdependencies.

**Deliverables**

- Extend state to `{ hunger: number, happiness: number, energy: number }` — all clamped to `[0, 100]`.
- Actions: `FEED` (↑hunger, small ↑happiness), `PLAY` (↑happiness, ↓energy), `REST` (↑energy over time, pet unavailable while resting).
- Resting mechanic: an `isResting` flag disables other actions and boosts energy each tick until full.
- Three stat bars in the UI, three action buttons with disabled states (e.g., can't Play if energy too low).
- Updated tests: all three stats clamp to `[0, 100]`; each action's side-effects verified.

**Demo:** The full care loop is playable. The player can keep the pet balanced by rotating actions.

**Out of Scope:** Sick/Evolved states, Heal action, personality, persistence.

---

## Phase 4 — Dynamic States (Normal / Sick / Evolved) + Heal

**Goal:** The pet visibly changes based on care history, with exactly three states and one recovery path.

**Deliverables**

- State machine module (`src/game/states.ts`) with exactly three states: `Normal | Sick | Evolved`.
- Transitions (the **only** transitions allowed):
  - `Normal → Sick` when any vital stays at/near 0 for a sustained period.
  - `Evolved → Sick` under the same rule (Evolved is not immune).
  - `Sick → (previous state)` **only** via the `HEAL` action. No passive recovery, no sustained-care cure.
  - `Normal → Evolved` when all vitals stay above a defined threshold for a defined period (e.g., ≥70% for N minutes). **One-way and permanent** — no regression, no chained evolutions.
- `HEAL` action: dispatched by a `<HealButton />` that renders **only while state === Sick**. Restores vitals to a safe band and transitions state back.
- Sprite swap per state (Normal, Sick, Evolved) + distinct idle animation.
- Visual cues around the pet (e.g., floating icon for Sick).
- Tests covering every allowed transition — and asserting forbidden ones (e.g., `Evolved → Normal` never happens, Heal has no effect outside Sick).

**Demo:** Neglect → pet gets Sick → only Heal cures it. Sustained care → pet Evolves, permanently.

**Out of Scope:** Easter eggs, naming, persistence, reversible or chained evolutions.

---

## Phase 5 — Persistence, Naming & Real-Time Aging

**Goal:** The pet survives page reloads, has a player-chosen name, and ages while the tab is closed. No permadeath.

**Deliverables**

- `localStorage` adapter with a versioned schema (`{ version, name, vitals, state, lastTickAt }`).
- `lastTickAt` timestamp persisted; on load, compute elapsed ticks and catch up (with a cap, e.g., max 8 hours of offline decay). Offline catch-up can drive the pet to Sick but **never ends the pet**.
- Name-the-pet flow on first load; name stored and displayed. Exactly one pet per browser.
- **Reset pet** button in settings with a confirmation dialog — the only way to end a pet. Clears storage and starts a fresh naming flow.
- Tests for the storage adapter, offline-catchup math, and the reset flow.

**Demo:** Close the tab, come back hours later — the pet reflects the time away. Name persists. Reset starts fresh after a confirmation.

**Out of Scope:** Easter eggs, polish, multiple pets.

---

## Phase 6 — Personal Touches & Easter Eggs

**Goal:** The pet has personality — expressed purely through animations and reactions, never gameplay.

**Deliverables**

- Idle mini-animations (yawn, blink, look around) that fire probabilistically.
- Reaction animations to each action (happy hop on play, chomp on feed, Zz on rest, sparkle on Heal).
- At least 3 Easter eggs, all **animation-only** (no mini-games, no new mechanics, no rewards that alter stats):
  - e.g., feed 10× in a row → queasy animation for a minute.
  - e.g., Konami code → confetti / secret color palette.
  - e.g., action at a specific time of day → unique reaction.
- Subtle quirks tied to pet name (deterministic personality hash from the name — affects animation variants only, not stat tuning).

**Demo:** The pet feels like a character, not a dashboard.

**Out of Scope:** Sound effects (Phase 7), mini-games (never), social sharing (never), notifications (never).

---

## Phase 7 — Polish & Ship

**Goal:** The app is production-ready and deployed.

**Deliverables**

- Accessibility pass: keyboard controls, `aria-live` for state changes, focus-visible styles, prefers-reduced-motion support.
- Responsive layout (mobile-friendly).
- Optional Web Audio beeps (mute toggle, off by default).
- Favicon + OG image + `<title>` + meta description.
- Deploy to Vercel; production URL in `README.md`.
- Manual QA checklist run on Chrome, Firefox, Safari.

**Demo:** Share the live URL with a friend. They play and don't need instructions.

**Out of Scope:** Anything not listed in the Mission's non-goals.

---

## Guiding Principles for Every Phase

1. **Ship a playable pet.** No phase ends with broken mechanics.
2. **Pure logic first, UI second.** Write the reducer + tests before wiring React.
3. **Keep it tiny.** Prefer deleting code over adding config.
4. **Revisit, don't regret.** Decisions in `tech-stack.md` can be changed between phases if a phase reveals a better path.
5. **Honor the Scope Contract.** Every phase must respect the ✅/🚫 table in `mission.md`. If a deliverable drifts into forbidden territory (mini-games, notifications, multiple pets, permadeath, complex evolutions, admin surfaces), cut it.
