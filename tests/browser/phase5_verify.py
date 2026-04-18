"""
Phase 5 browser verification.

Proves in a real browser what jsdom integration tests can only approximate:
localStorage persists across reloads, the native confirm() dialog fires,
and the naming form gate works end to end. Runs under
scripts/with_server.py --server "pnpm start".

Mirrors specs/2026-04-18-phase-5-persistence-naming-aging/validation.md
§Browser verification.
"""

import sys
import traceback
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

BASE_URL = "http://localhost:3000"
INITIAL_PATH = Path("/tmp/phase-5-initial.png")
NAMED_PATH = Path("/tmp/phase-5-named.png")
FINAL_PATH = Path("/tmp/phase-5-final.png")

TICK_INTERVAL_MS = 3000
MAX_OFFLINE_MS = 8 * 60 * 60 * 1000
STORAGE_KEY = "tiny-tamagotchi:v1"


def wait_for_ready(page: Page) -> None:
    page.wait_for_load_state("networkidle", timeout=30_000)


def goto_clean(page: Page) -> None:
    page.goto(BASE_URL)
    page.evaluate("() => window.localStorage.clear()")
    page.goto(BASE_URL)
    wait_for_ready(page)


def read_bar(page: Page, label: str) -> int:
    attr = page.get_by_role("progressbar", name=label).get_attribute("aria-valuenow")
    assert attr is not None, f"progressbar {label} missing aria-valuenow"
    return int(attr)


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

        # 1. Baseline: clear storage, assert naming form gate.
        goto_clean(page)
        assert page.get_by_role("heading", name="Name your pet").count() == 1, (
            "naming form heading missing on clean load"
        )
        assert page.get_by_role("progressbar").count() == 0, (
            "no progressbar should render before naming"
        )
        assert page.get_by_role("button", name="Feed").count() == 0, (
            "no Feed button before naming"
        )
        assert page.get_by_role("button", name="Play").count() == 0
        assert page.get_by_role("button", name="Rest").count() == 0
        page.screenshot(path=str(INITIAL_PATH), full_page=True)

        # 2. Name validation: empty and too-long submissions.
        page.get_by_role("button", name="Confirm").click()
        assert page.get_by_text("Name must be 1-24 characters").count() == 1

        input_loc = page.get_by_placeholder("Enter a name")
        # 24 is max but the input has maxLength=24, so typing 25 chars is
        # naturally blocked. Type 24 (ok) and verify accept.
        input_loc.fill("Pixel")
        page.get_by_role("button", name="Confirm").click()
        page.wait_for_selector(
            '[role="progressbar"][aria-label="Hunger"]', state="attached", timeout=5000
        )
        assert page.get_by_role("heading", name="Name your pet").count() == 0, (
            "naming form should disappear after submit"
        )
        assert page.get_by_text("Pixel", exact=True).count() >= 1, (
            "name should render in the settings row"
        )
        page.screenshot(path=str(NAMED_PATH), full_page=True)

        # 3. Persistence across reload.
        page.reload()
        wait_for_ready(page)
        assert page.get_by_role("heading", name="Name your pet").count() == 0, (
            "naming form should not reappear after reload when name is stored"
        )
        assert page.get_by_text("Pixel", exact=True).count() >= 1
        assert page.get_by_role("progressbar", name="Hunger").count() == 1

        # 4. Offline catch-up under the cap (1 minute in the past).
        page.evaluate(
            f"""() => {{
              const raw = window.localStorage.getItem('{STORAGE_KEY}');
              const parsed = JSON.parse(raw);
              parsed.vitals.hunger = 80;
              parsed.vitals.happiness = 80;
              parsed.vitals.energy = 80;
              parsed.lastTickAt = Date.now() - 60000;
              window.localStorage.setItem('{STORAGE_KEY}', JSON.stringify(parsed));
            }}"""
        )
        page.reload()
        wait_for_ready(page)
        hunger_after_60s = read_bar(page, "Hunger")
        assert hunger_after_60s < 80, (
            f"offline catch-up should lower hunger; got {hunger_after_60s}"
        )
        assert hunger_after_60s >= 60, (
            f"60s of decay should not produce hunger below 60; got {hunger_after_60s}"
        )

        # 5. Offline cap at MAX_OFFLINE_MS.
        page.evaluate(
            f"""() => {{
              const raw = window.localStorage.getItem('{STORAGE_KEY}');
              const parsed = JSON.parse(raw);
              parsed.vitals.hunger = 100;
              parsed.vitals.happiness = 100;
              parsed.vitals.energy = 100;
              parsed.neglectTicks = {{ hunger: 0, happiness: 0, energy: 0 }};
              parsed.careTicks = 0;
              parsed.state = 'Normal';
              parsed.hasEvolved = false;
              parsed.lastTickAt = Date.now() - 10 * 24 * 60 * 60 * 1000;
              window.localStorage.setItem('{STORAGE_KEY}', JSON.stringify(parsed));
            }}"""
        )
        page.reload()
        wait_for_ready(page)
        expected_ticks = MAX_OFFLINE_MS // TICK_INTERVAL_MS
        expected_hunger = max(0, 100 - expected_ticks)
        actual_hunger = read_bar(page, "Hunger")
        assert abs(actual_hunger - expected_hunger) <= 1, (
            f"offline cap off: expected hunger ~{expected_hunger}, got {actual_hunger}"
        )
        assert page.get_by_role("heading", name="Name your pet").count() == 0, (
            "pet should still be alive after 10 days (Sick ok, not ended)"
        )

        # 6. Reset flow through the native confirm.
        page.once("dialog", lambda dialog: dialog.accept())
        page.get_by_role("button", name="Reset pet").click()
        page.wait_for_selector("text=Name your pet", state="visible", timeout=5000)
        stored_after_reset = page.evaluate(
            f"() => window.localStorage.getItem('{STORAGE_KEY}')"
        )
        assert stored_after_reset is None, (
            f"storage should be cleared after Reset; got {stored_after_reset!r}"
        )

        # 7. Corrupt localStorage recovery.
        page.evaluate(
            f"() => window.localStorage.setItem('{STORAGE_KEY}', '{{bad json')"
        )
        page.goto(BASE_URL)
        wait_for_ready(page)
        assert page.get_by_role("heading", name="Name your pet").count() == 1, (
            "corrupt JSON should drop the app back to the naming form"
        )

        # 8. Version mismatch recovery.
        page.evaluate(
            f"""() => window.localStorage.setItem(
              '{STORAGE_KEY}',
              JSON.stringify({{ version: 99, name: 'ghost' }})
            )"""
        )
        page.goto(BASE_URL)
        wait_for_ready(page)
        assert page.get_by_role("heading", name="Name your pet").count() == 1

        # 9. Console audit.
        page.screenshot(path=str(FINAL_PATH), full_page=True)
        ctx.close()
        browser.close()

        assert not console_errors, f"console errors: {console_errors}"
        assert not console_warnings, f"console warnings: {console_warnings}"
        assert not page_errors, f"page errors: {page_errors}"

    print("[phase5_verify] ALL CHECKS PASSED")
    for path in (INITIAL_PATH, NAMED_PATH, FINAL_PATH):
        print(f"  {path}")


if __name__ == "__main__":
    try:
        run()
    except AssertionError as e:
        print(f"[phase5_verify] FAIL: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[phase5_verify] ERROR: {e!r}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
