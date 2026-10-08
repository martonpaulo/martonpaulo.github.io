// The list order and the date wording of a discontinued project.
import assert from "node:assert/strict";
import { test } from "node:test";

import { discontinuedLast, monthYear } from "../src/lib/status.ts";

test("discontinued projects come last, and each group keeps its order", () => {
  const projects = [
    { slug: "a", status: "active" },
    { slug: "gone-1", status: "discontinued" },
    { slug: "b", status: "archived" },
    { slug: "gone-2", status: "discontinued" },
    { slug: "c", status: "active" },
  ];
  assert.deepEqual(
    discontinuedLast(projects).map((project) => project.slug),
    ["a", "b", "c", "gone-1", "gone-2"],
  );
});

test("a YYYY-MM month reads as the month and the year", () => {
  assert.equal(monthYear("2026-10", "en"), "October 2026");
  assert.equal(monthYear("2025-01", "en"), "January 2025");
});
