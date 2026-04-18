# Mission

## Vision
Build a digital companion that feels **alive** — not just a number simulator. Tiny Tamagotchi is a small, always-there pet that rewards attentive care with personality, and gently punishes neglect with visible consequences. The goal is to recreate the emotional core of the 90s Tamagotchi in a modern web form: a creature you *want* to check on.

## Scope Contract (Hard Boundaries)

| ✅ Required | 🚫 Not Allowed |
|---|---|
| **Pet:** naming, 1 user, 1 evolution, 1 recovery path | Authentication and multiple users, multiple pets, inventories, or currencies |
| **Stats (0–100):** Hunger, Happiness, Energy | Mini-games, social features, or notifications |
| **Actions:** Feed, Play, Rest | Admin features or complex evolutions |
| **States:** Normal, Sick, Evolved | Permanent death mechanics |

Every pillar below must honor this table. If a future idea conflicts with the right column, it's out of scope.

## Core Pillars

### 1. Living Vitals
Three stats, each on a **0–100 integer scale**, decay in real time:
- **Hunger** — drifts down over time; at low values, neglect can trigger Sick.
- **Happiness** — drifts down without interaction; low happiness alters behavior.
- **Energy** — depletes with activity and wakefulness; exhaustion forces Rest.

Vitals tick on a real-time clock (even when the tab is hidden, within reason), so the pet exists on its *own* schedule. Stats are clamped to `[0, 100]` — they never go negative, and there is no permadeath when a stat hits 0.

### 2. The Care Loop
Three primary actions — the entire action surface:
- **Feed** — restores Hunger, small Happiness bump.
- **Play** — restores Happiness, costs Energy.
- **Rest** — restores Energy over time; pet is unavailable while sleeping.

A fourth **Heal** affordance exists *only while the pet is Sick*. It is not a general action — it is the single recovery path back to Normal. Care is about balance and timing, not spamming buttons.

### 3. Dynamic States
Exactly three states, one active at a time:
- **Normal** — baseline healthy sprite + idle animation.
- **Sick** — entered when a vital stays at/near 0 for a sustained period. Only exit: the **Heal** action (single recovery path).
- **Evolved** — reached once after sustained good care; **one-way permanent** (no chained or complex evolutions). An Evolved pet can still become Sick and recover via Heal.

States are *earned*, not scripted by a timer alone.

### 4. Personal Touches
The pet is more than stats. Small quirks make it feel like a character:
- Easter-egg **animations/reactions** (never mini-games) to specific action sequences, e.g., feeding 10× in a row → queasy animation.
- Idle mini-animations (yawns, blinks, looks around).
- Context-aware reactions (happy dance on full Happiness, grumpy pose when woken).
- A player-chosen name, remembered across sessions.

## Lifecycle & Reset
- No permadeath. A neglected pet becomes **Sick**, never dies.
- A manual **Reset pet** option (with confirmation) lets the player voluntarily start over — this is the only way a pet ends.

## Non-Goals (enforcing the Scope Contract)
- Authentication, user accounts, multiple users.
- Multiple pets, inventories, currencies, shops.
- Mini-games of any kind.
- Social features, leaderboards, sharing flows.
- Notifications (push, email, in-app toasts acting as alerts).
- Admin/debug UI surfaces in production.
- Complex evolution trees, branching forms, or reversible evolutions.
- Permanent death mechanics, final game-over screens.
- Monetization, ads.

## Success Criteria
- A first-time visitor understands the care loop within 30 seconds, no tutorial.
- A returning visitor feels their pet's state *changed meaningfully* while they were away.
- The player forms a small emotional attachment — they name the pet, and they come back.
- The entire experience loads fast and runs smoothly on a modest laptop or phone.

## Audience
Casual web visitors, nostalgic millennials, and anyone who wants a low-stakes desktop companion tab. No gamer skill required; mechanics are legible in seconds.
