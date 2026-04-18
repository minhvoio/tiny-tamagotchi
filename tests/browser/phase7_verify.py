"""
Phase 7 browser verification.

Covers what jsdom cannot: real CSS layout at 360px, real focus ring
rendering, real axe-core scan on the live DOM, and a real request to the
Next.js OG image route. Runs under scripts/with_server.py
--server "pnpm start" --port 3000 -- python phase7_verify.py.

Steps (mirrors specs/2026-04-18-phase-7-polish-ship/validation.md
§Browser verification):

  1. Baseline at /, name the pet through the Phase 5 gate, screenshot.
  2. Skip-link: href="#pet-actions" exists, focusing it moves
     document.activeElement to the link, activating it lands focus on the
     first action button.
  3. Focus-visible ring: tab to an action button and assert computed
     outline-width is not "0px".
  4. Landmark regions: "Pet vitals" has three progressbars, "Pet actions"
     has >= 1 button.
  5. axe-core scan: zero violations across the whole page.
  6. Responsive layout at 360x640 across Normal / Sick / Evolved states,
     no horizontal overflow (documentElement.scrollWidth <= 360).
  7. OG image route: /opengraph-image returns 200 image/*.
  8. Metadata in page source: <title> starts with "Tiny Tamagotchi",
     exactly one <meta name="viewport">, og:type=website.
  9. Console audit: zero errors, zero pageerrors.
 10. Final screenshot.
"""

import glob
import re
import sys
import traceback
from pathlib import Path

from playwright.sync_api import Page, sync_playwright


def _load_axe_bundle() -> str:
    here = Path(__file__).resolve()
    repo_tiny = here.parents[2]
    candidates = [
        repo_tiny / "node_modules" / "axe-core" / "axe.min.js",
    ]
    candidates.extend(
        Path(p)
        for p in glob.glob(
            str(
                repo_tiny
                / "node_modules"
                / ".pnpm"
                / "axe-core@*"
                / "node_modules"
                / "axe-core"
                / "axe.min.js"
            )
        )
    )
    for cand in candidates:
        if cand.exists():
            return cand.read_text(encoding="utf-8")
    raise RuntimeError(f"axe-core bundle not found under {repo_tiny / 'node_modules'}")


BASE_URL = "http://localhost:3000"
INITIAL_PATH = Path("/tmp/phase-7-initial.png")
NAMED_PATH = Path("/tmp/phase-7-named.png")
MOBILE_NORMAL = Path("/tmp/phase-7-360-normal.png")
MOBILE_SICK = Path("/tmp/phase-7-360-sick.png")
MOBILE_EVOLVED = Path("/tmp/phase-7-360-evolved.png")
FINAL_PATH = Path("/tmp/phase-7-final.png")

STORAGE_KEY = "tiny-tamagotchi:v1"


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


def seed_state(page: Page, state: str, *, has_evolved: bool = False) -> None:
    page.evaluate(
        """({ state, hasEvolved, key }) => {
            const payload = {
                version: 1,
                name: 'Pixel',
                vitals: { hunger: 50, happiness: 50, energy: 50 },
                isResting: false,
                state: state,
                hasEvolved: hasEvolved,
                neglectTicks: { hunger: 0, happiness: 0, energy: 0 },
                careTicks: 0,
                lastTickAt: Date.now(),
                feedStreak: { count: 0, lastFeedAt: 0 },
                queasyUntil: 0,
                sleepCapUntil: 0,
            };
            window.localStorage.setItem(key, JSON.stringify(payload));
        }""",
        {"state": state, "hasEvolved": has_evolved, "key": STORAGE_KEY},
    )
    page.reload()
    wait_for_ready(page)


def assert_no_horizontal_overflow(page: Page) -> None:
    scroll_width = page.evaluate("() => document.documentElement.scrollWidth")
    assert scroll_width <= 360, f"horizontal overflow: scrollWidth={scroll_width}"


def run() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        page = ctx.new_page()

        console_errors: list[str] = []
        page_errors: list[str] = []

        page.on(
            "console",
            lambda msg: (
                console_errors.append(f"{msg.type}: {msg.text}")
                if msg.type == "error"
                else None
            ),
        )
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))

        # 1. Baseline + name the pet.
        goto_clean(page)
        page.screenshot(path=str(INITIAL_PATH), full_page=True)
        name_pet(page, "Pixel")
        page.screenshot(path=str(NAMED_PATH), full_page=True)

        # 2. Skip-link existence and focus linkage.
        skip = page.locator('a[href="#pet-actions"]')
        assert skip.count() == 1, "skip-link should exist exactly once"
        skip_position = page.evaluate(
            """() => {
                const el = document.querySelector('a[href="#pet-actions"]');
                if (!el) return null;
                const rect = el.getBoundingClientRect();
                return { w: rect.width, h: rect.height };
            }"""
        )
        assert skip_position is not None, "skip-link bounding rect missing"
        assert skip_position["w"] <= 1 or skip_position["h"] <= 1, (
            f"skip-link should be visually hidden when not focused; got {skip_position!r}"
        )
        page.focus('a[href="#pet-actions"]')
        active_is_skip = page.evaluate(
            """() => document.activeElement === document.querySelector('a[href="#pet-actions"]')"""
        )
        assert active_is_skip, (
            "focusing the skip-link should land document.activeElement on it"
        )
        page.keyboard.press("Enter")
        page.keyboard.press("Tab")
        active_is_first_action = page.evaluate(
            """() => {
                const region = document.querySelector('section[aria-label="Pet actions"]');
                if (!region) return false;
                const first = region.querySelector('button');
                return first !== null && document.activeElement === first;
            }"""
        )
        assert active_is_first_action, (
            "after Enter + Tab on the skip-link, focus should land on the first action button"
        )

        # 3. Focus-visible ring: tab until a button is focused, check outline-width.
        for _ in range(8):
            focused_is_button = page.evaluate(
                "() => document.activeElement && document.activeElement.tagName === 'BUTTON'"
            )
            if focused_is_button:
                break
            page.keyboard.press("Tab")
        outline = page.evaluate(
            """() => {
                const s = window.getComputedStyle(document.activeElement);
                return s.outlineWidth;
            }"""
        )
        assert outline not in ("0px", "", None), (
            f"focus-visible ring missing on active button: outline-width={outline!r}"
        )

        # 4. Landmark regions.
        vitals = page.get_by_role("region", name="Pet vitals")
        assert vitals.count() == 1, "Pet vitals region should exist exactly once"
        bars = page.locator('section[aria-label="Pet vitals"] [role="progressbar"]')
        assert bars.count() == 3, (
            f"Pet vitals should contain exactly 3 progressbars, got {bars.count()}"
        )
        actions = page.get_by_role("region", name="Pet actions")
        assert actions.count() == 1, "Pet actions region should exist exactly once"
        action_buttons = page.locator('section[aria-label="Pet actions"] button')
        assert action_buttons.count() >= 1, (
            "Pet actions should contain at least 1 button"
        )

        # 5. axe-core scan.
        axe_src = _load_axe_bundle()
        page.add_script_tag(content=axe_src)
        violations = page.evaluate(
            """async () => {
                const res = await window.axe.run(document);
                return res.violations.map(v => ({
                    id: v.id,
                    impact: v.impact,
                    help: v.help,
                    nodes: v.nodes.map(n => ({
                        target: n.target,
                        failureSummary: n.failureSummary,
                    })),
                }));
            }"""
        )
        assert violations == [], f"axe-core violations: {violations}"

        # 6. Responsive layout at 360x640 across Normal / Sick / Evolved.
        page.set_viewport_size({"width": 360, "height": 640})
        seed_state(page, "Normal")
        assert_no_horizontal_overflow(page)
        page.screenshot(path=str(MOBILE_NORMAL), full_page=True)

        seed_state(page, "Sick")
        assert_no_horizontal_overflow(page)
        heal = page.get_by_role("button", name="Heal")
        assert heal.count() == 1, "Heal button should be visible in Sick state at 360px"
        page.screenshot(path=str(MOBILE_SICK), full_page=True)

        seed_state(page, "Evolved", has_evolved=True)
        assert_no_horizontal_overflow(page)
        page.screenshot(path=str(MOBILE_EVOLVED), full_page=True)

        # 7. OG image route.
        resp = page.request.get(f"{BASE_URL}/opengraph-image")
        assert resp.status == 200, f"OG image status={resp.status}"
        og_ct = resp.headers.get("content-type", "")
        assert og_ct.startswith("image/"), f"OG image content-type={og_ct!r}"

        # 8. Metadata in page source.
        page.set_viewport_size({"width": 1280, "height": 800})
        page.goto(BASE_URL)
        wait_for_ready(page)
        html = page.content()
        assert "<title>Tiny Tamagotchi" in html, (
            "page <title> should start with 'Tiny Tamagotchi'"
        )
        viewport_tags = re.findall(r'<meta\s+name="viewport"', html)
        assert len(viewport_tags) == 1, (
            f"exactly one viewport meta tag expected; found {len(viewport_tags)}"
        )
        assert 'property="og:type" content="website"' in html, (
            'og:type="website" missing from page source'
        )

        # 9. Console audit.
        page.screenshot(path=str(FINAL_PATH), full_page=True)
        ctx.close()
        browser.close()

        assert not console_errors, f"console errors: {console_errors}"
        assert not page_errors, f"page errors: {page_errors}"

    print("[phase7_verify] ALL CHECKS PASSED")
    for path in (
        INITIAL_PATH,
        NAMED_PATH,
        MOBILE_NORMAL,
        MOBILE_SICK,
        MOBILE_EVOLVED,
        FINAL_PATH,
    ):
        print(f"  {path}")


if __name__ == "__main__":
    try:
        run()
    except AssertionError as e:
        print(f"[phase7_verify] FAIL: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[phase7_verify] ERROR: {e!r}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
