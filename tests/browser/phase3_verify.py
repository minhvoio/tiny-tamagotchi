"""
Phase 3 browser verification.

Implements the eight checks defined in
specs/2026-04-18-phase-3-full-care-loop/validation.md §Browser verification:
  1. Baseline capture at / with networkidle.
  2. Bar ordering + initial values (Hunger/Happiness/Energy, all 100).
  3. Button ordering + initial disabled state (Feed disabled, "Pet is full").
  4. Care-loop sequence (decay -> feed -> play -> disabled -> rest -> recovery).
  5. Atomic auto-wake: we never observe a "Wake" button paint with Energy=100.
  6. Keyboard a11y: all three buttons reachable with accessible names.
  7. Console audit (zero errors/warnings/pageerrors).
  8. Final screenshot.

Runs against 'pnpm start' (after 'pnpm build') — Next.js dev HMR prevents
Playwright's networkidle from ever settling, so we use production output.
"""

import sys
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

BASE_URL = "http://localhost:3000"
INITIAL_PATH = Path("/tmp/phase-3-initial.png")
RESTING_PATH = Path("/tmp/phase-3-resting.png")
FINAL_PATH = Path("/tmp/phase-3-final.png")

TICK_INTERVAL_MS = 3000
PLAY_MIN_ENERGY = 10
MAX_STAT = 100


def read_bar(page: Page, label: str) -> int:
    attr = page.get_by_role("progressbar", name=label).get_attribute("aria-valuenow")
    assert attr is not None, f"progressbar {label} missing aria-valuenow"
    return int(attr)


def bar_labels_in_order(page: Page) -> list[str]:
    return page.eval_on_selector_all(
        '[role="progressbar"]',
        "els => els.map(e => e.getAttribute('aria-label'))",
    )


def button_labels_in_order(page: Page) -> list[str]:
    return page.eval_on_selector_all(
        "main button",
        "els => els.map(e => e.textContent.trim())",
    )


def wait_for_ready(page: Page) -> None:
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle", timeout=30_000)
    page.wait_for_selector(
        '[role="progressbar"][aria-label="Energy"]', state="attached", timeout=30_000
    )
    page.wait_for_selector(
        'main button:has-text("Feed")', state="attached", timeout=30_000
    )
    page.wait_for_function(
        """() => {
          const el = document.querySelector(
            '[role="progressbar"][aria-label="Energy"]'
          );
          return !!el && el.getAttribute('aria-valuenow') === '100';
        }""",
        timeout=30_000,
    )


def run() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context()
        page = ctx.new_page()

        console_errors: list[str] = []
        console_warnings: list[str] = []
        page_errors: list[str] = []

        page.on(
            "console",
            lambda msg: (
                console_errors.append(f"{msg.type}: {msg.text}")
                if msg.type == "error"
                else (
                    console_warnings.append(f"{msg.type}: {msg.text}")
                    if msg.type in ("warning", "warn")
                    else None
                )
            ),
        )
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))

        # 1. Baseline.
        wait_for_ready(page)
        page.screenshot(path=str(INITIAL_PATH), full_page=True)

        # 2. Bar ordering + initial values.
        labels = bar_labels_in_order(page)
        assert labels == ["Hunger", "Happiness", "Energy"], (
            f"progressbar order was {labels!r}, expected Hunger/Happiness/Energy"
        )
        for label in ("Hunger", "Happiness", "Energy"):
            assert read_bar(page, label) == MAX_STAT, (
                f"initial {label} aria-valuenow != 100"
            )

        # 3. Button ordering + initial disabled state.
        btn_labels = button_labels_in_order(page)
        assert btn_labels == ["Feed", "Play", "Rest"], (
            f"button order was {btn_labels!r}, expected Feed/Play/Rest"
        )
        feed = page.get_by_role("button", name="Feed")
        play = page.get_by_role("button", name="Play")
        assert feed.is_disabled(), "Feed should start disabled at hunger=100"
        assert feed.get_attribute("title") == "Pet is full", (
            f"Feed title was {feed.get_attribute('title')!r}, expected 'Pet is full'"
        )
        assert not play.is_disabled(), "Play should start enabled at energy=100"

        # 4. Care-loop sequence.
        # 4a. Wait at least one tick; assert all three bars dropped.
        before = {lbl: read_bar(page, lbl) for lbl in ("Hunger", "Happiness", "Energy")}
        page.wait_for_timeout(int(TICK_INTERVAL_MS * 1.3))
        after = {lbl: read_bar(page, lbl) for lbl in ("Hunger", "Happiness", "Energy")}
        for lbl in ("Hunger", "Happiness", "Energy"):
            assert after[lbl] < before[lbl], (
                f"{lbl} did not decay ({before[lbl]} -> {after[lbl]})"
            )

        # 4b. Feed -> Hunger=100, Feed re-disables with "Pet is full".
        feed.click()
        page.wait_for_function(
            "() => {"
            '  const el = document.querySelector(\'[role="progressbar"][aria-label="Hunger"]\');'
            "  return el && Number(el.getAttribute('aria-valuenow')) === 100;"
            "}",
            timeout=5000,
        )
        assert feed.is_disabled(), "Feed not re-disabled after hunger hit 100"
        assert feed.get_attribute("title") == "Pet is full"

        # 4c. Spam Play until energy < PLAY_MIN_ENERGY; Play disabled with "Too tired to play".
        for _ in range(20):
            if read_bar(page, "Energy") < PLAY_MIN_ENERGY:
                break
            play.click()
            page.wait_for_timeout(60)
        assert read_bar(page, "Energy") < PLAY_MIN_ENERGY, (
            f"Energy still >= {PLAY_MIN_ENERGY} after Play spam: {read_bar(page, 'Energy')}"
        )
        assert play.is_disabled(), (
            "Play not disabled after energy dropped below threshold"
        )
        assert play.get_attribute("title") == "Too tired to play", (
            f"Play title was {play.get_attribute('title')!r}"
        )

        # 4d. Rest -> label becomes 'Wake'; Feed and Play show 'Pet is resting'.
        rest = page.get_by_role("button", name="Rest")
        rest.click()
        page.wait_for_selector(
            "main button >> text=Wake", state="visible", timeout=5000
        )
        wake = page.get_by_role("button", name="Wake")
        assert wake.count() == 1, "expected exactly one Wake button"
        assert feed.get_attribute("title") == "Pet is resting", (
            f"Feed title during rest was {feed.get_attribute('title')!r}"
        )
        assert play.get_attribute("title") == "Pet is resting", (
            f"Play title during rest was {play.get_attribute('title')!r}"
        )
        # Hunger and Happiness frozen across two ticks while resting.
        frozen_before = {lbl: read_bar(page, lbl) for lbl in ("Hunger", "Happiness")}
        energy_before_rest_ticks = read_bar(page, "Energy")
        page.wait_for_timeout(int(TICK_INTERVAL_MS * 2.1))
        for lbl in ("Hunger", "Happiness"):
            assert read_bar(page, lbl) == frozen_before[lbl], (
                f"{lbl} changed during rest ({frozen_before[lbl]} -> {read_bar(page, lbl)})"
            )
        assert read_bar(page, "Energy") > energy_before_rest_ticks, (
            "Energy did not recover during rest"
        )
        page.screenshot(path=str(RESTING_PATH), full_page=True)

        # 5. Atomic auto-wake.
        # Run JS in the page to observe the (buttonText, energyValue) pair repeatedly
        # across the transition. We assert we NEVER see ('Wake', 100) simultaneously;
        # instead the transition goes directly to ('Rest', 100).
        page.evaluate(
            """() => {
              window.__phase3Observations = [];
              const record = () => {
                const energyEl = document.querySelector(
                  '[role="progressbar"][aria-label="Energy"]'
                );
                const btns = Array.from(document.querySelectorAll('main button'));
                const restBtn = btns.find(
                  b => b.textContent.trim() === 'Rest' || b.textContent.trim() === 'Wake'
                );
                if (!energyEl || !restBtn) return;
                window.__phase3Observations.push({
                  label: restBtn.textContent.trim(),
                  energy: Number(energyEl.getAttribute('aria-valuenow')),
                  t: performance.now(),
                });
              };
              window.__phase3Interval = setInterval(record, 16);
              record();
            }"""
        )
        # Wait until Rest label returns AND energy hits MAX_STAT together.
        page.wait_for_function(
            """() => {
              const energyEl = document.querySelector(
                '[role="progressbar"][aria-label="Energy"]'
              );
              const btns = Array.from(document.querySelectorAll('main button'));
              const restBtn = btns.find(
                b => b.textContent.trim() === 'Rest' || b.textContent.trim() === 'Wake'
              );
              if (!energyEl || !restBtn) return false;
              return (
                restBtn.textContent.trim() === 'Rest' &&
                Number(energyEl.getAttribute('aria-valuenow')) === 100
              );
            }""",
            timeout=(MAX_STAT // 10 + 5) * TICK_INTERVAL_MS,
        )
        observations = page.evaluate(
            """() => {
              clearInterval(window.__phase3Interval);
              const energyEl = document.querySelector(
                '[role="progressbar"][aria-label="Energy"]'
              );
              const btns = Array.from(document.querySelectorAll('main button'));
              const restBtn = btns.find(
                b => b.textContent.trim() === 'Rest' || b.textContent.trim() === 'Wake'
              );
              if (energyEl && restBtn) {
                window.__phase3Observations.push({
                  label: restBtn.textContent.trim(),
                  energy: Number(energyEl.getAttribute('aria-valuenow')),
                  t: performance.now(),
                  final: true,
                });
              }
              return window.__phase3Observations;
            }"""
        )
        split_frames = [
            o for o in observations if o["label"] == "Wake" and o["energy"] == MAX_STAT
        ]
        assert not split_frames, (
            f"auto-wake was NOT atomic: observed {len(split_frames)} frame(s) "
            f"with label='Wake' AND energy=100 (sample: {split_frames[:3]})"
        )
        saw_wake_before_max = any(
            o["label"] == "Wake" and o["energy"] < MAX_STAT for o in observations
        )
        saw_rest_at_max = any(
            o["label"] == "Rest" and o["energy"] == MAX_STAT for o in observations
        )
        assert saw_wake_before_max, (
            "never observed Wake + energy<100 during the auto-wake window; "
            "sampling interval may be too coarse or rest state never engaged"
        )
        assert saw_rest_at_max, "final state Rest + energy=100 was not observed"

        # After auto-wake, Feed and Play must be re-enabled if their own gates allow.
        rest_again = page.get_by_role("button", name="Rest")
        assert rest_again.count() == 1, "Rest label did not return after auto-wake"

        # 6. Keyboard a11y — Tab through the three action buttons. Chromium excludes
        # disabled buttons from the Tab order, so we wait for Hunger to drop below
        # MAX_STAT (Feed enabled) before asserting all three names are reachable.
        page.wait_for_function(
            """() => {
              const el = document.querySelector(
                '[role="progressbar"][aria-label="Hunger"]'
              );
              return !!el && Number(el.getAttribute('aria-valuenow')) < 100;
            }""",
            timeout=TICK_INTERVAL_MS * 5,
        )
        page.locator("body").click()
        accessible_names: list[str] = []
        for _ in range(20):
            page.keyboard.press("Tab")
            focused_name = page.evaluate(
                """() => {
                  const el = document.activeElement;
                  if (!el || el.tagName !== 'BUTTON') return null;
                  return el.textContent.trim();
                }"""
            )
            if focused_name and focused_name not in accessible_names:
                accessible_names.append(focused_name)
            if all(n in accessible_names for n in ("Feed", "Play", "Rest")):
                break
        for name in ("Feed", "Play", "Rest"):
            assert name in accessible_names, (
                f"button {name!r} not reachable via Tab; got {accessible_names!r}"
            )

        # 7. Console audit.
        page.screenshot(path=str(FINAL_PATH), full_page=True)
        ctx.close()
        browser.close()

        assert not console_errors, f"console errors: {console_errors}"
        assert not console_warnings, f"console warnings: {console_warnings}"
        assert not page_errors, f"page errors: {page_errors}"

    print("[phase3_verify] ALL CHECKS PASSED")
    print(f"  initial : {INITIAL_PATH}")
    print(f"  resting : {RESTING_PATH}")
    print(f"  final   : {FINAL_PATH}")


if __name__ == "__main__":
    try:
        run()
    except AssertionError as e:
        print(f"[phase3_verify] FAIL: {e}", file=sys.stderr)
        sys.exit(1)
