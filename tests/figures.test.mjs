// The GitHub figures a project row shows (#71): stars from 10, downloads from 100, never forks.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  countText,
  DOWNLOADS_SHOWN_FROM,
  shownFigures,
  STARS_SHOWN_FROM,
} from "../src/lib/figures.ts";

const metrics = (stars, downloads) => ({ stars, downloads, forks: 5 });

test("a project over both thresholds shows its stars, then its downloads", () => {
  assert.deepEqual(shownFigures(metrics(29, 442)), [
    { kind: "stars", count: 29 },
    { kind: "downloads", count: 442 },
  ]);
});

test("each threshold counts on its own, from its exact value", () => {
  assert.deepEqual(shownFigures(metrics(STARS_SHOWN_FROM, 0)), [
    { kind: "stars", count: STARS_SHOWN_FROM },
  ]);
  assert.deepEqual(shownFigures(metrics(2, DOWNLOADS_SHOWN_FROM)), [
    { kind: "downloads", count: DOWNLOADS_SHOWN_FROM },
  ]);
});

test("a project under both thresholds, or with no recorded figures, shows none", () => {
  assert.deepEqual(shownFigures(metrics(STARS_SHOWN_FROM - 1, DOWNLOADS_SHOWN_FROM - 1)), []);
  assert.deepEqual(shownFigures(undefined), []);
});

test("a count is grouped as British English writes it", () => {
  assert.equal(countText(1234), "1,234");
});
