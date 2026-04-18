"""
Phase 2 browser verification.

Implements the seven checks defined in
specs/2026-04-18-phase-2-hunger-vital/validation.md §Browser verification:
  1. Baseline capture at / with networkidle.
  2. Initial-state assertions (progressbar 100/100, Feed disabled).
  3. Decay over time (~2 ticks).
  4. Feed action (+FEED_AMOUNT, clamped to 100; re-disabled on clamp).
  5. Clamp boundary (repeat feed can't exceed 100).
  6. Long-idle floor (hunger reaches 0 and stays).
  7. Console audit (zero errors/warnings/pageerrors).

Runs against 'pnpm start' after 'pnpm build' — see phase1_verify.py for the
same rationale (Next.js dev HMR prevents Playwright's networkidle from settling).
"""

import sys
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

BASE_URL = "http://localhost:3000"
INITIAL_PATH = Path("/tmp/phase-2-initial.png")
DECAYED_PATH = Path("/tmp/phase-2-decayed.png")
CLAMPED_PATH = Path("/tmp/phase-2-clamped.png")
FLOOR_PATH = Path("/tmp/phase-2-floor.png")

TICK_INTERVAL_MS = 3000
FEED_AMOUNT = 20
MAX_STAT = 100
MIN_STAT = 0


def read_hunger(page: Page) -> int:
    attr = page.get_by_role("progressbar", name="Hunger").get_attribute("aria-valuenow")
    assert attr is not None, "progressbar Hunger has no aria-valuenow"
    return int(attr)


def wait_for_ready(page: Page) -> None:
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle", timeout=30_000)
    page.wait_for_selector('[role="progressbar"]', state="visible", timeout=30_000)
    page.wait_for_selector('button:has-text("Feed")', state="visible", timeout=30_000)


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

        # 2. Initial-state assertions.
        bar = page.get_by_role("progressbar", name="Hunger")
        assert bar.get_attribute("aria-valuenow") == "100", (
            f"initial aria-valuenow = {bar.get_attribute('aria-valuenow')!r}"
        )
        assert bar.get_attribute("aria-valuemin") == "0", "aria-valuemin != 0"
        assert bar.get_attribute("aria-valuemax") == "100", "aria-valuemax != 100"
        feed = page.get_by_role("button", name="Feed")
        assert feed.is_disabled(), "Feed button should start disabled at hunger=100"

        # 3. Decay over time — wait ~2 ticks and confirm hunger dropped by 1-3.
        before_decay = read_hunger(page)
        page.wait_for_timeout(int(TICK_INTERVAL_MS * 2.2))
        after_decay = read_hunger(page)
        delta_decay = before_decay - after_decay
        assert 1 <= delta_decay <= 3, (
            f"expected decay between 1 and 3 over ~2 ticks, got {delta_decay} "
            f"(before={before_decay}, after={after_decay})"
        )
        page.screenshot(path=str(DECAYED_PATH), full_page=True)

        # 4. Feed action — click once, confirm delta == FEED_AMOUNT (clamped).
        before_feed = read_hunger(page)
        feed.click()
        page.wait_for_function(
            "(prev) => {"
            '  const el = document.querySelector(\'[role="progressbar"][aria-label="Hunger"]\');'
            "  if (!el) return false;"
            "  const v = Number(el.getAttribute('aria-valuenow'));"
            "  return v !== prev;"
            "}",
            arg=before_feed,
            timeout=5000,
        )
        after_feed = read_hunger(page)
        expected_after_feed = min(before_feed + FEED_AMOUNT, MAX_STAT)
        assert after_feed == expected_after_feed, (
            f"after feed: expected {expected_after_feed}, got {after_feed}"
        )

        # 5. Clamp boundary — spam Feed until hunger=100, assert never exceeds and button disables.
        # Safety cap: never more than ceil(MAX_STAT/FEED_AMOUNT) + 2 clicks to reach 100 from any state.
        for _ in range(MAX_STAT // FEED_AMOUNT + 2):
            if read_hunger(page) >= MAX_STAT:
                break
            feed.click()
            page.wait_for_timeout(100)
        final_value = read_hunger(page)
        assert final_value == MAX_STAT, (
            f"after clamp-boundary spam, hunger = {final_value}, expected {MAX_STAT}"
        )
        assert feed.is_disabled(), "Feed should be disabled again at hunger=100"
        page.screenshot(path=str(CLAMPED_PATH), full_page=True)

        ctx.close()

        # 6. Long-idle floor — fresh context so the bar starts at 100 then we wait enough ticks to drain.
        # Waiting MAX_STAT full ticks guarantees hunger floors at 0 with margin. Then wait extra ticks
        # and re-read to confirm it sticks at 0.
        floor_ctx = browser.new_context()
        floor_page = floor_ctx.new_page()

        floor_errors: list[str] = []
        floor_warnings: list[str] = []
        floor_page_errors: list[str] = []
        floor_page.on(
            "console",
            lambda msg: (
                floor_errors.append(f"{msg.type}: {msg.text}")
                if msg.type == "error"
                else (
                    floor_warnings.append(f"{msg.type}: {msg.text}")
                    if msg.type in ("warning", "warn")
                    else None
                )
            ),
        )
        floor_page.on("pageerror", lambda exc: floor_page_errors.append(str(exc)))

        wait_for_ready(floor_page)
        # Drain: wait a bit over MAX_STAT ticks.
        floor_page.wait_for_function(
            "() => {"
            '  const el = document.querySelector(\'[role="progressbar"][aria-label="Hunger"]\');'
            "  if (!el) return false;"
            "  return Number(el.getAttribute('aria-valuenow')) === 0;"
            "}",
            timeout=(MAX_STAT + 5) * TICK_INTERVAL_MS,
        )
        first_zero = read_hunger(floor_page)
        assert first_zero == MIN_STAT, f"expected floor at 0, got {first_zero}"
        # Hold at zero: wait several more ticks and re-check.
        floor_page.wait_for_timeout(int(TICK_INTERVAL_MS * 3.5))
        held_zero = read_hunger(floor_page)
        assert held_zero == MIN_STAT, (
            f"expected hunger to stick at 0, got {held_zero} (no permadeath; no negatives)"
        )
        floor_page.screenshot(path=str(FLOOR_PATH), full_page=True)
        floor_ctx.close()

        browser.close()

        # 7. Console audit across both contexts.
        combined_errors = console_errors + floor_errors
        combined_warnings = console_warnings + floor_warnings
        combined_page_errors = page_errors + floor_page_errors
        assert not combined_errors, f"console errors: {combined_errors}"
        assert not combined_warnings, f"console warnings: {combined_warnings}"
        assert not combined_page_errors, f"page errors: {combined_page_errors}"

    print("[phase2_verify] ALL CHECKS PASSED")
    print(f"  initial  : {INITIAL_PATH}")
    print(f"  decayed  : {DECAYED_PATH}")
    print(f"  clamped  : {CLAMPED_PATH}")
    print(f"  floor    : {FLOOR_PATH}")


if __name__ == "__main__":
    try:
        run()
    except AssertionError as e:
        print(f"[phase2_verify] FAIL: {e}", file=sys.stderr)
        sys.exit(1)
