"""
Phase 4 browser verification.

Drives the production-mode Next.js server through the dynamic-state loop
described in specs/2026-04-18-phase-4-dynamic-states-heal/validation.md
§Browser verification. Runs under scripts/with_server.py --server "pnpm start".
"""

import sys
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

BASE_URL = "http://localhost:3000"
NORMAL_PATH = Path("/tmp/phase-4-normal.png")
SICK_PATH = Path("/tmp/phase-4-sick.png")
EVOLVED_PATH = Path("/tmp/phase-4-evolved.png")
FINAL_PATH = Path("/tmp/phase-4-final.png")

TICK_INTERVAL_MS = 3000
SICK_NEGLECT_TICKS = 10
PLAY_MIN_ENERGY = 10
MAX_STAT = 100


def wait_for_ready(page: Page) -> None:
    page.wait_for_load_state("networkidle", timeout=30_000)
    page.wait_for_selector(
        'svg[role="img"][data-state]', state="attached", timeout=30_000
    )
    page.wait_for_selector(
        '[data-testid="state-announcer"]', state="attached", timeout=30_000
    )


def read_bar(page: Page, label: str) -> int:
    attr = page.get_by_role("progressbar", name=label).get_attribute("aria-valuenow")
    assert attr is not None, f"progressbar {label} missing aria-valuenow"
    return int(attr)


def data_state(page: Page) -> str:
    value = page.locator('svg[role="img"][data-state]').first.get_attribute(
        "data-state"
    )
    assert value is not None, "pet svg missing data-state"
    return value


def announcer_text(page: Page) -> str:
    return page.locator('[data-testid="state-announcer"]').text_content() or ""


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

        # ---------- 1. Baseline at / ----------
        page.goto(BASE_URL)
        wait_for_ready(page)
        assert data_state(page) == "Normal", (
            f"expected data-state=Normal on fresh load, got {data_state(page)!r}"
        )
        assert page.locator('[data-testid="crown"]').count() == 0, (
            "crown should be absent in Normal"
        )
        assert page.locator('[data-testid="sick-indicator"]').count() == 0, (
            "sick indicator should be absent in Normal"
        )
        assert page.get_by_role("button", name="Heal").count() == 0, (
            "Heal button should be absent in Normal"
        )

        # 2. aria-label per state.
        pet_label = (
            page.locator('svg[role="img"]').first.get_attribute("aria-label") or ""
        )
        assert "idling" in pet_label.lower(), (
            f"Normal aria-label should match /idling/i, got {pet_label!r}"
        )
        page.screenshot(path=str(NORMAL_PATH), full_page=True)

        # ---------- 3. Drive to Sick through the sick-near seed ----------
        # The Play-until-Energy<10 route takes ~30 real seconds once the energy
        # is in neglect territory. We use the seed harness from plan.md §10 —
        # its three presets ARE the supported acceleration path — to keep the
        # verifier quick while still exercising the real reducer.
        page.goto(f"{BASE_URL}/?__seed=sick-near")
        wait_for_ready(page)
        page.wait_for_function(
            """() => {
              const pet = document.querySelector('svg[role="img"][data-state]');
              return !!pet && pet.getAttribute('data-state') === 'Sick';
            }""",
            timeout=int(TICK_INTERVAL_MS * (SICK_NEGLECT_TICKS + 2) * 1.2),
        )
        assert data_state(page) == "Sick"
        page.wait_for_function(
            """() => {
              const el = document.querySelector('[data-testid="state-announcer"]');
              return !!el && (el.textContent || '').trim() === 'Pet is now Sick';
            }""",
            timeout=5000,
        )
        assert page.locator('[data-testid="sick-indicator"]').count() == 1
        heal_btn = page.get_by_role("button", name="Heal")
        assert heal_btn.count() == 1, "Heal button should be visible when Sick"
        sick_label = (
            page.locator('svg[role="img"]').first.get_attribute("aria-label") or ""
        )
        assert "sick" in sick_label.lower(), f"Sick aria-label was {sick_label!r}"
        page.screenshot(path=str(SICK_PATH), full_page=True)

        # ---------- 4. HEAL atomicity ----------
        heal_btn.click()
        page.wait_for_function(
            """() => {
              const pet = document.querySelector('svg[role="img"][data-state]');
              const healBtns = Array.from(document.querySelectorAll('main button'))
                .filter(b => b.textContent.trim() === 'Heal');
              const announcer = document.querySelector('[data-testid="state-announcer"]');
              if (!pet || !announcer) return false;
              return (
                pet.getAttribute('data-state') === 'Normal' &&
                healBtns.length === 0 &&
                (announcer.textContent || '').trim() === 'Pet is now Normal'
              );
            }""",
            timeout=5000,
        )
        assert data_state(page) == "Normal"
        assert page.get_by_role("button", name="Heal").count() == 0
        assert page.locator('[data-testid="sick-indicator"]').count() == 0
        for lbl in ("Hunger", "Happiness", "Energy"):
            assert read_bar(page, lbl) >= 50, (
                f"{lbl} should be >= 50 after Heal, got {read_bar(page, lbl)}"
            )

        # ---------- 5. Drive to Evolved via accelerated seed ----------
        page.goto(f"{BASE_URL}/?__seed=evolve-near")
        wait_for_ready(page)
        page.wait_for_function(
            """() => {
              const pet = document.querySelector('svg[role="img"][data-state]');
              return !!pet && pet.getAttribute('data-state') === 'Evolved';
            }""",
            timeout=int(TICK_INTERVAL_MS * 3),
        )
        assert data_state(page) == "Evolved"
        assert page.locator('[data-testid="crown"]').count() == 1
        evolved_label = (
            page.locator('svg[role="img"]').first.get_attribute("aria-label") or ""
        )
        assert "thriving" in evolved_label.lower(), (
            f"Evolved aria-label was {evolved_label!r}"
        )
        page.wait_for_function(
            """() => {
              const el = document.querySelector('[data-testid="state-announcer"]');
              return !!el && (el.textContent || '').trim() === 'Pet is now Evolved';
            }""",
            timeout=5000,
        )
        page.screenshot(path=str(EVOLVED_PATH), full_page=True)

        # ---------- 6. Evolved -> Sick -> Heal -> Evolved ----------
        page.goto(f"{BASE_URL}/?__seed=evolved-near-sick")
        wait_for_ready(page)
        page.wait_for_function(
            """() => {
              const pet = document.querySelector('svg[role="img"][data-state]');
              return !!pet && pet.getAttribute('data-state') === 'Sick';
            }""",
            timeout=int(TICK_INTERVAL_MS * (SICK_NEGLECT_TICKS + 2) * 1.2),
        )
        assert data_state(page) == "Sick"
        page.get_by_role("button", name="Heal").click()
        page.wait_for_function(
            """() => {
              const pet = document.querySelector('svg[role="img"][data-state]');
              const announcer = document.querySelector('[data-testid="state-announcer"]');
              if (!pet || !announcer) return false;
              return (
                pet.getAttribute('data-state') === 'Evolved' &&
                (announcer.textContent || '').trim() === 'Pet is now Evolved'
              );
            }""",
            timeout=5000,
        )
        assert data_state(page) == "Evolved"
        assert page.locator('[data-testid="crown"]').count() == 1, (
            "crown should return after HEAL from an Evolved-Sick seed"
        )

        # ---------- 7. hasEvolved stays true across another neglect/heal cycle ----------
        # Drive back to Sick by clicking Play until energy < 10 from Evolved.
        play = page.get_by_role("button", name="Play")
        for _ in range(30):
            if read_bar(page, "Energy") < PLAY_MIN_ENERGY:
                break
            if play.is_disabled():
                break
            play.click()
            page.wait_for_timeout(50)
        page.wait_for_function(
            """() => {
              const pet = document.querySelector('svg[role="img"][data-state]');
              return !!pet && pet.getAttribute('data-state') === 'Sick';
            }""",
            timeout=int(TICK_INTERVAL_MS * (SICK_NEGLECT_TICKS + 3) * 1.2),
        )
        page.get_by_role("button", name="Heal").click()
        page.wait_for_function(
            """() => {
              const pet = document.querySelector('svg[role="img"][data-state]');
              return !!pet && pet.getAttribute('data-state') === 'Evolved';
            }""",
            timeout=5000,
        )
        assert page.locator('[data-testid="crown"]').count() == 1, (
            "crown must be back: hasEvolved is one-way"
        )

        # ---------- 8. Keyboard a11y ----------
        # HealButton is not in the Tab order when not Sick (it's not rendered).
        page.goto(BASE_URL)
        wait_for_ready(page)
        page.locator("body").click()
        tab_names: list[str] = []
        for _ in range(20):
            page.keyboard.press("Tab")
            name = page.evaluate(
                """() => {
                  const el = document.activeElement;
                  if (!el || el.tagName !== 'BUTTON') return null;
                  return el.textContent.trim();
                }"""
            )
            if name and name not in tab_names:
                tab_names.append(name)
            if len(tab_names) >= 5:
                break
        assert "Heal" not in tab_names, (
            f"Heal should not be focusable when not Sick; tab order: {tab_names}"
        )

        # When Sick, HealButton must be focusable.
        page.goto(f"{BASE_URL}/?__seed=sick-near")
        wait_for_ready(page)
        page.wait_for_function(
            """() => {
              const pet = document.querySelector('svg[role="img"][data-state]');
              return !!pet && pet.getAttribute('data-state') === 'Sick';
            }""",
            timeout=int(TICK_INTERVAL_MS * (SICK_NEGLECT_TICKS + 2) * 1.2),
        )
        page.locator("body").click()
        sick_tab_names: list[str] = []
        for _ in range(20):
            page.keyboard.press("Tab")
            name = page.evaluate(
                """() => {
                  const el = document.activeElement;
                  if (!el || el.tagName !== 'BUTTON') return null;
                  return el.textContent.trim();
                }"""
            )
            if name and name not in sick_tab_names:
                sick_tab_names.append(name)
            if "Heal" in sick_tab_names:
                break
        assert "Heal" in sick_tab_names, (
            f"Heal should be focusable when Sick; tab order: {sick_tab_names}"
        )

        # ---------- 9. Console audit ----------
        page.screenshot(path=str(FINAL_PATH), full_page=True)
        ctx.close()
        browser.close()

        assert not console_errors, f"console errors: {console_errors}"
        assert not console_warnings, f"console warnings: {console_warnings}"
        assert not page_errors, f"page errors: {page_errors}"

    print("[phase4_verify] ALL CHECKS PASSED")
    for path in (NORMAL_PATH, SICK_PATH, EVOLVED_PATH, FINAL_PATH):
        print(f"  {path}")


if __name__ == "__main__":
    import traceback

    try:
        run()
    except AssertionError as e:
        print(f"[phase4_verify] FAIL: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[phase4_verify] ERROR: {e!r}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
