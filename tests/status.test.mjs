// Which projects the current lists show, and the date wording of a stopped one.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  currentOnly,
  homeProjects,
  monthYear,
  periodLabel,
  projectScores,
  rankedProjects,
} from "../src/lib/status.ts";

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

const SITE = "https://example.com";
const figures = (stars, forks, downloads, release, open, closedIssues, commits, recentCommits) => ({
  stars,
  forks,
  downloads,
  release,
  public: open,
  closedIssues,
  commits,
  recentCommits,
});
const project = (name, metrics, live = true) => ({
  name,
  status: "active",
  links: live ? { live: `https://${name.toLowerCase().replaceAll(" ", "")}.example.com/` } : {},
  metrics,
});

// The owner's figures of 2026-11-26 (#43), each with its own subdomain page, and the score he
// computed for each from them.
const OWNER = [
  [project("Ink Tools", figures(2, 0, 234, true, true, 283, 1225, 1225)), 90],
  [project("WindowHop", figures(29, 1, 442, true, true, 123, 2161, 290)), 89],
  [project("Meantime", figures(2, 0, 59, true, true, 17, 111, 75)), 74],
  [project("Tabelo", figures(1, 0, 0, false, true, 376, 886, 590)), 57],
  [project("AtlasTint", figures(1, 0, 0, false, true, 36, 104, 99)), 55],
  [project("Country Badge", figures(1, 0, 0, false, true, 19, 99, 93)), 55],
  [project("Batuque", figures(0, 0, 0, false, true, 40, 200, 200)), 42],
  [project("Leve", figures(0, 0, 0, false, true, 14, 54, 54)), 40],
  [project("Lights", figures(0, 0, 0, false, true, 18, 129, 74)), 37],
  [project("Moon Uniform", figures(0, 0, 0, false, false, 14, 103, 103)), 31],
  [project("Panoram", figures(0, 0, 0, false, false, 2223, 4411, 4195), false), 30],
  [project("Trickle Tabs", figures(0, 0, 0, false, false, 5, 38, 38)), 29],
  [project("Workbench", figures(0, 0, 0, false, false, 1988, 3117, 3016), false), 29],
  [project("DELE Diario", figures(0, 0, 0, false, false, 304, 574, 574), false), 25],
];

test("the score weighs use, availability, work and recent activity as the owner set", () => {
  const projects = OWNER.map(([p]) => p);
  const scores = projectScores(projects, SITE);
  assert.deepEqual(
    OWNER.map(([p]) => [p.name, scores.get(p)]),
    OWNER.map(([p, score]) => [p.name, score]),
  );
  assert.deepEqual(
    rankedProjects(projects, SITE).map((p) => p.name),
    OWNER.map(([p]) => p.name),
  );
});

test("the home page takes the six highest scores of the current projects, ties by name", () => {
  const same = figures(1, 0, 0, false, true, 10, 10, 0);
  const projects = [
    project("Zeta", figures(5, 0, 0, true, true, 10, 10, 10)),
    project("Gone", figures(99, 9, 999, true, true, 999, 999, 999)),
    project("Delta", same),
    project("Alpha", same),
    project("Beta", same),
    project("Eta", same),
    project("Iota", same),
    project("Theta", same),
  ];
  projects[1].status = "discontinued";
  assert.deepEqual(
    homeProjects(projects, SITE).map((p) => p.name),
    ["Zeta", "Alpha", "Beta", "Delta", "Eta", "Iota"],
  );
});

test("a current project with no recorded figures fails instead of scoring zero", () => {
  const bare = { name: "Bare", status: "active", links: {} };
  assert.throws(() => projectScores([bare], SITE), /Bare has no metrics/);
});

test("a period reads as one year or a range", () => {
  assert.equal(periodLabel({ from: 2023, to: 2023 }), "2023");
  assert.equal(periodLabel({ from: 2024, to: 2025 }), "2024–2025");
});

test("a YYYY-MM month reads as the month and the year", () => {
  assert.equal(monthYear("2026-10", "en"), "October 2026");
  assert.equal(monthYear("2025-01", "en"), "January 2025");
});
