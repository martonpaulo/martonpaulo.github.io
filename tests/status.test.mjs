// Which projects the current lists show, and the date wording of a stopped one.
import assert from "node:assert/strict";
import { test } from "node:test";

import { currentOnly, monthYear, periodLabel } from "../src/lib/status.ts";

test("the current lists leave discontinued projects out and keep the order", () => {
  const projects = [
    { slug: "a", status: "active" },
    { slug: "gone-1", status: "discontinued" },
    { slug: "b", status: "archived" },
    { slug: "gone-2", status: "discontinued" },
    { slug: "c", status: "active" },
  ];
  assert.deepEqual(
    currentOnly(projects).map((project) => project.slug),
    ["a", "b", "c"],
  );
});

test("a period reads as one year or a range", () => {
  assert.equal(periodLabel({ from: 2023, to: 2023 }), "2023");
  assert.equal(periodLabel({ from: 2024, to: 2025 }), "2024–2025");
});

test("a YYYY-MM month reads as the month and the year", () => {
  assert.equal(monthYear("2026-10", "en"), "October 2026");
  assert.equal(monthYear("2025-01", "en"), "January 2025");
});
