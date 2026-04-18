"""
Phase 1 browser verification.

Runs the five checks defined in specs/2026-04-18-phase-1-pet-on-screen/validation.md §Browser verification:
  1. Baseline capture at / with networkidle, screenshot to /tmp/phase-1-after.png.
  2. DOM assertions: role=img with idling label, pet CSS Module class, h1 text.
  3. Animation evidence: two screenshots of the pet bbox 1s apart must have different hashes.
  4. Reduced-motion regression: fresh context with reduced_motion='reduce' -> two screenshots must be identical.
  5. Console audit: zero console errors and zero console warnings during the run.

Exit code 0 = all pass. Any failure raises AssertionError and exits non-zero.
"""

import hashlib
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:3000"
AFTER_PATH = Path("/tmp/phase-1-after.png")
BOB_A_PATH = Path("/tmp/phase-1-bob-a.png")
BOB_B_PATH = Path("/tmp/phase-1-bob-b.png")
REDUCED_A_PATH = Path("/tmp/phase-1-reduced-a.png")
REDUCED_B_PATH = Path("/tmp/phase-1-reduced-b.png")


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def capture_pet_bbox(page, out_path: Path) -> None:
    # Use page.screenshot(clip=...) instead of locator.screenshot so we don't
    # wait for element stability (the bob animation is the whole point — it
    # is intentionally never stable in the default context).
    pet = page.get_by_role("img", name=re.compile(r"tiny tamagotchi, idling", re.I))
    box = pet.bounding_box()
    if box is None:
        raise AssertionError("could not compute bounding box for the pet")
    # Clip to the pet's bbox, rounded to integer pixels. We expand by 4px on
    # each side to include the full swept area of the -2px/+0 bob animation.
    pad = 4
    clip = {
        "x": max(0, int(box["x"]) - pad),
        "y": max(0, int(box["y"]) - pad),
        "width": int(box["width"]) + 2 * pad,
        "height": int(box["height"]) + 2 * pad,
    }
    page.screenshot(path=str(out_path), clip=clip, animations="allow")


def run() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Default context: animation should run.
        default_ctx = browser.new_context()
        page = default_ctx.new_page()

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

        # 1. Baseline capture.
        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle", timeout=30_000)
        page.wait_for_selector(
            'svg[aria-label="Tiny tamagotchi, idling"]',
            state="visible",
            timeout=30_000,
        )
        page.screenshot(path=str(AFTER_PATH), full_page=True)

        # 2. DOM assertions.
        pet_locator = page.get_by_role(
            "img", name=re.compile(r"tiny tamagotchi, idling", re.I)
        )
        assert pet_locator.count() == 1, (
            f"expected exactly one pet img, got {pet_locator.count()}"
        )
        class_attr = pet_locator.get_attribute("class") or ""
        assert re.search(r"pet", class_attr), (
            f"pet element class {class_attr!r} does not contain a 'pet' token"
        )
        heading = page.get_by_role("heading", level=1)
        assert heading.inner_text().strip() == "Tiny Tamagotchi", (
            f"heading text was {heading.inner_text()!r}"
        )

        # 3. Animation evidence — two screenshots of the pet bbox 1s apart must differ.
        capture_pet_bbox(page, BOB_A_PATH)
        page.wait_for_timeout(1000)
        capture_pet_bbox(page, BOB_B_PATH)
        assert sha(BOB_A_PATH) != sha(BOB_B_PATH), (
            "bob animation did not produce visually distinct frames 1s apart"
        )

        default_ctx.close()

        # 4. Reduced-motion regression — fresh context, animation must be paused.
        reduced_ctx = browser.new_context(reduced_motion="reduce")
        reduced_page = reduced_ctx.new_page()
        reduced_page.goto(BASE_URL)
        reduced_page.wait_for_load_state("networkidle", timeout=30_000)
        reduced_page.wait_for_selector(
            'svg[aria-label="Tiny tamagotchi, idling"]',
            state="visible",
            timeout=30_000,
        )
        capture_pet_bbox(reduced_page, REDUCED_A_PATH)
        reduced_page.wait_for_timeout(1000)
        capture_pet_bbox(reduced_page, REDUCED_B_PATH)
        assert sha(REDUCED_A_PATH) == sha(REDUCED_B_PATH), (
            "reduced-motion frames differ; animation was not disabled by prefers-reduced-motion"
        )
        reduced_ctx.close()

        # 5. Console audit.
        browser.close()

        assert not console_errors, f"console errors: {console_errors}"
        assert not console_warnings, f"console warnings: {console_warnings}"
        assert not page_errors, f"page errors: {page_errors}"

    print("[phase1_verify] ALL CHECKS PASSED")
    print(f"  baseline          : {AFTER_PATH}")
    print(f"  bob frames (diff) : {BOB_A_PATH} / {BOB_B_PATH}")
    print(f"  reduced (same)    : {REDUCED_A_PATH} / {REDUCED_B_PATH}")


if __name__ == "__main__":
    try:
        run()
    except AssertionError as e:
        print(f"[phase1_verify] FAIL: {e}", file=sys.stderr)
        sys.exit(1)
