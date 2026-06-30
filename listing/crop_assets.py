#!/usr/bin/env python3
"""
Pre-crop UI elements (popovers, popup) from source screenshots.

Strategy: within a hand-tuned ROI around each known element, find the largest
contiguous white region (connected component). Use its bounding box + small
padding (for drop-shadow) as the crop. Then per-asset shave/expand to trim
adjacent Banner bleed the blob detector can't separate.

Pixel-perfect, deterministic, no AI.
"""
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

REPO = Path.home() / "usf-rmp-extension"
SRC = REPO / "screenshots" / "raw"
DST = REPO / "listing" / "assets"
DST.mkdir(parents=True, exist_ok=True)


@dataclass(frozen=True)
class Job:
    src: str
    dst: str
    roi: tuple[int, int, int, int]  # x0, y0, x1, y1 in source pixels
    pad: int = 25                    # drop-shadow padding around blob bbox
    # Post-crop adjustments (positive = shave, negative = expand). Applied
    # AFTER the blob-bbox + padding step. Use to trim adjacent Banner content
    # that connected-component detection can't separate from the popover.
    shave_top: int = 0
    shave_right: int = 0
    shave_bottom: int = 0
    shave_left: int = 0


JOBS: list[Job] = [
    Job(
        src="chen.png", dst="chen-popover.png",
        roi=(1700, 850, 2500, 1450),
        shave_top=10, shave_right=30, shave_bottom=80,
    ),
    Job(
        src="pradhan.png", dst="pradhan-popover.png",
        roi=(1700, 1050, 2500, 1730),
        shave_top=10, shave_right=30, shave_bottom=50,
    ),
    Job(
        src="arizona.png", dst="arizona-popup.png",
        roi=(2700, 150, 3360, 1260),
        shave_top=-30,   # expand top to recover "Professor Ratings" header
        shave_left=25,   # drop Banner column ("mp"/"p") bleed on left edge
        shave_bottom=40, # drop "12 of 29 seats" bleed, keep GitHub link
    ),
]

WHITE_THRESHOLD = 252      # stricter — exclude anti-aliased edges of Banner borders
OPENING_ITERATIONS = 4     # morphological opening to break thin pixel bridges


def find_largest_white_blob_bbox(
    arr: np.ndarray, roi: tuple[int, int, int, int]
) -> tuple[int, int, int, int] | None:
    x0, y0, x1, y1 = roi
    region = arr[y0:y1, x0:x1, :3]
    mask = np.all(region >= WHITE_THRESHOLD, axis=2)
    # Break thin connections between popover white and Banner cell white
    mask = ndimage.binary_opening(mask, iterations=OPENING_ITERATIONS)
    labeled, n = ndimage.label(mask)
    if n == 0:
        return None
    sizes = ndimage.sum(mask, labeled, range(1, n + 1))
    largest_label = int(np.argmax(sizes)) + 1
    print(f"    components found: {n}, largest size: {int(sizes[largest_label - 1])} px")
    ys, xs = np.where(labeled == largest_label)
    return (x0 + xs.min(), y0 + ys.min(), x0 + xs.max(), y0 + ys.max())


def main() -> None:
    for job in JOBS:
        src_path = SRC / job.src
        print(f"\n[*] {job.src}")
        img = Image.open(src_path)
        arr = np.array(img)
        print(f"    src dims: {img.size}")
        bbox = find_largest_white_blob_bbox(arr, job.roi)
        if bbox is None:
            print("    !! no white blob found in ROI — skipping")
            continue
        bx0, by0, bx1, by1 = bbox
        print(f"    blob bbox: ({bx0}, {by0}) → ({bx1}, {by1})  "
              f"size: {bx1 - bx0}×{by1 - by0}")
        W, H = img.size
        # Pad for drop-shadow, then apply per-asset shave/expand
        crop_x0 = max(0, bx0 - job.pad + job.shave_left)
        crop_y0 = max(0, by0 - job.pad + job.shave_top)
        crop_x1 = min(W, bx1 + job.pad - job.shave_right)
        crop_y1 = min(H, by1 + job.pad - job.shave_bottom)
        cropped = img.crop((crop_x0, crop_y0, crop_x1, crop_y1))
        dst_path = DST / job.dst
        cropped.save(dst_path)
        print(f"    saved: {dst_path.relative_to(REPO)} "
              f"({cropped.size[0]}×{cropped.size[1]})")


if __name__ == "__main__":
    main()
