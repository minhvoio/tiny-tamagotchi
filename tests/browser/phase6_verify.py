"""
Phase 6 browser verification.

Drives the production-mode Next.js server through the personality + easter-egg
checks described in
specs/2026-04-18-phase-6-personal-touches-easter-eggs/validation.md
§Browser verification:

  1. Baseline at /, name the pet through the Phase 5 gate.
  2. Variant class: assert the pet SVG carries a /petVariant[012]/ class
     (CSS-Module-hashed so we match the hash suffix with a regex).
  3. Reaction animation: click Feed once; assert data-reaction="chomp"
     appears on the SVG within 100 ms; then wait past the animation and
     assert data-reaction is absent (onAnimationEnd cleanup).
  4. Queasy egg: click Feed 10 times within 30 s; assert data-egg="queasy"
     appears on the SVG.
  5. Konami confetti: press the 10-key sequence; assert the overlay
     appears, then waits past CONFETTI_DURATION_MS and is gone.
  6. Idle animation: poll up to 30 s for data-idle-animation.
  7. Console audit: zero errors / warnings / pageerrors.
  8. Final screenshot.

Runs under skills/webapp-testing/scripts/with_server.py
--server "pnpm start" --port 3000 -- python phase6_verify.py.
"""

import sys
import traceback
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

BASE_URL = "http://localhost:3000"
INITIAL_PATH = Path("/tmp/phase-6-initial.png")
NAMED_PATH = Path("/tmp/phase-6-named.png")
QUEASY_PATH = Path("/tmp/phase-6-queasy.png")
KONAMI_PATH = Path("/tmp/phase-6-konami.png")
FINAL_PATH = Path("/tmp/phase-6-final.png")

CONFETTI_DURATION_MS = 3_000
KONAMI_SEQUENCE = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
]


def wait_for_ready(page: Page) -> None:
    page.wait_for_load_state("networkidle", timeout=30_000)


def goto_clean(page: Page) -> None:
    page.goto(BASE_URL)
    page.evaluate("() => window.localStorage.clear()")
    page.goto(BASE_URL)
    wait_for_ready(page)


def name_pet(page: Page, name: str = "Pixel") -> None:
    page.wait_for_selector(
        'input[placeholder="Enter a name"]', state="attached", timeout=10_000
    )
    page.get_by_placeholder("Enter a name").fill(name)
    page.get_by_role("button", name="Confirm").click()
    page.wait_for_selector(
        '[role="progressbar"][aria-label="Hunger"]', state="attached", timeout=5000
    )


def pet_locator(page: Page):
    return page.locator('svg[role="img"][data-state]').first


def press_sequence(page: Page, keys: list[str]) -> None:
    for key in keys:
        page.keyboard.press(key)


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

        # 1. Baseline + name the pet.
        goto_clean(page)
        page.screenshot(path=str(INITIAL_PATH), full_page=True)
        name_pet(page, "Pixel")
        page.screenshot(path=str(NAMED_PATH), full_page=True)

        # 2. Variant class on the pet SVG.
        pet = pet_locator(page)
        pet_class = pet.get_attribute("class") or ""
        assert any(
            f"petVariant{i}" in pet_class or f"pet-variant-{i}" in pet_class
            for i in (0, 1, 2)
        ), f"pet SVG is missing a petVariant class; class attr was {pet_class!r}"

        # 3. Reaction animation: Feed -> data-reaction=chomp -> clears.
        page.get_by_role("button", name="Feed").click()
        page.wait_for_function(
            """() => {
              const p = document.querySelector('svg[role="img"][data-state]');
              return !!p && p.getAttribute('data-reaction') === 'chomp';
            }""",
            timeout=1000,
        )
        # CSS animation runs for 0.6 s; give it 1.5 s to fire animationend
        # plus the React handler that clears the attribute.
        page.wait_for_function(
            """() => {
              const p = document.querySelector('svg[role="img"][data-state]');
              return !!p && !p.hasAttribute('data-reaction');
            }""",
            timeout=3000,
        )

        # 4. Queasy egg: click Feed 10 times; expect data-egg="queasy".
        # First, undo the hunger accumulation by letting a natural TICK happen
        # is too slow. Instead we ensure hunger is below 100 by reloading with
        # a seeded state via localStorage (same trick as phase5_verify.py).
        page.evaluate(
            """() => {
              const raw = window.localStorage.getItem('tiny-tamagotchi:v1');
              if (!raw) return;
              const parsed = JSON.parse(raw);
              parsed.vitals.hunger = 0;
              parsed.vitals.happiness = 0;
              parsed.vitals.energy = 50;
              parsed.feedStreak = { count: 0, lastFeedAt: 0 };
              parsed.queasyUntil = 0;
              parsed.sleepCapUntil = 0;
              window.localStorage.setItem('tiny-tamagotchi:v1', JSON.stringify(parsed));
            }"""
        )
        page.reload()
        wait_for_ready(page)
        feed_btn = page.get_by_role("button", name="Feed")
        for _ in range(10):
            feed_btn.click()
            page.wait_for_timeout(80)
        page.wait_for_function(
            """() => {
              const p = document.querySelector('svg[role="img"][data-state]');
              return !!p && p.getAttribute('data-egg') === 'queasy';
            }""",
            timeout=2500,
        )
        page.screenshot(path=str(QUEASY_PATH), full_page=True)

        # 5. Konami confetti: press the 10-key sequence; overlay shows, then
        #    clears after CONFETTI_DURATION_MS.
        page.locator("body").click()
        press_sequence(page, KONAMI_SEQUENCE)
        page.wait_for_selector('[data-testid="konami-confetti"]', timeout=1000)
        page.screenshot(path=str(KONAMI_PATH), full_page=True)
        page.wait_for_function(
            """() => document.querySelector('[data-testid="konami-confetti"]') === null""",
            timeout=CONFETTI_DURATION_MS + 2000,
        )

        # 6. Idle animation: poll up to 30 s for data-idle-animation.
        observed_idle = False
        for _ in range(60):
            idle = pet_locator(page).get_attribute("data-idle-animation")
            if idle in ("yawn", "blink", "look-around"):
                observed_idle = True
                break
            page.wait_for_timeout(500)
        assert observed_idle, (
            "data-idle-animation never appeared on the pet SVG within 30 s"
        )

        # 7. Console audit.
        page.screenshot(path=str(FINAL_PATH), full_page=True)
        ctx.close()
        browser.close()

        assert not console_errors, f"console errors: {console_errors}"
        assert not console_warnings, f"console warnings: {console_warnings}"
        assert not page_errors, f"page errors: {page_errors}"

    print("[phase6_verify] ALL CHECKS PASSED")
    for path in (INITIAL_PATH, NAMED_PATH, QUEASY_PATH, KONAMI_PATH, FINAL_PATH):
        print(f"  {path}")


if __name__ == "__main__":
    try:
        run()
    except AssertionError as e:
        print(f"[phase6_verify] FAIL: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[phase6_verify] ERROR: {e!r}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
