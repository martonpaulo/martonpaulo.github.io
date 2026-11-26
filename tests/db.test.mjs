// Invariants the schema cannot express. The content loader keys projects by
// slug, so a duplicate would silently overwrite an entry instead of failing.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { projectKinds } from "../src/lib/kinds.ts";
import { HOME_COUNT, homeProjects } from "../src/lib/status.ts";

const read = async (name) =>
  JSON.parse(await readFile(new URL(`../db/${name}.json`, import.meta.url), "utf8"));

const [projects, links, site, copy] = await Promise.all(
  ["projects", "links", "site", "copy"].map(read),
);

const SEARCH_SNIPPET_MAX = 160;

test("every project has a unique slug", () => {
  const slugs = projects.map((project) => project.slug);
  assert.equal(new Set(slugs).size, slugs.length, `duplicate slugs in ${slugs.join(", ")}`);
});

test("every project has a link, or a note saying why it has none", () => {
  for (const project of projects) {
    const hasLink = Object.values(project.links).some(Boolean);
    assert.ok(hasLink || project.note, `${project.slug} has neither a link nor a note`);
  }
});

// The owner's current projects (#43). A project joins or leaves the current list only when the
// owner changes this list; every other project is Earlier work (#42).
const OWNER_CURRENT = [
  "atlastint",
  "batuque",
  "country-badge",
  "dele-diario",
  "ink-tools",
  "leve",
  "lights",
  "meantime",
  "moon-uniform",
  "panoram",
  "tabelo",
  "trickle-tabs",
  "windowhop",
  "workbench",
];

test("the current projects are exactly the owner's list", () => {
  const current = projects.filter((project) => project.status !== "discontinued");
  assert.deepEqual(current.map((project) => project.slug).sort(), OWNER_CURRENT);
});

test("every current project records its repository and its stars", () => {
  for (const project of projects.filter((project) => project.status !== "discontinued")) {
    assert.ok(project.repo, `${project.slug} has no repo`);
    assert.ok(
      Number.isInteger(project.stars),
      `${project.slug} has no stars; run scripts/stars.mjs`,
    );
  }
});

test("the home page shows six projects, each with artwork and a tile", () => {
  const home = homeProjects(projects);
  assert.equal(home.length, HOME_COUNT);
  for (const project of home) {
    assert.ok(project.image, `${project.slug} is on the home page without an image`);
    assert.ok(
      project.tile || project.gradient,
      `${project.slug} is on the home page without a tile`,
    );
  }
});

test("every project kind has a label in the copy", () => {
  for (const project of projects) {
    assert.ok(project.kinds.length > 0, `${project.slug} declares no kind`);
    for (const kind of project.kinds) {
      assert.ok(copy.kinds[kind], `${project.slug} has kind ${kind} without a label`);
    }
  }
});

// A kind is the platform a project runs on, and each kind is a tab: a kind no current project
// has would be an empty tab, and a label without a kind a leftover (#43).
test("every kind is a platform with a tab: a current project has it, and it has a label", () => {
  const current = projects.filter((project) => project.status !== "discontinued");
  for (const project of projects) {
    for (const kind of project.kinds) {
      assert.ok(projectKinds.includes(kind), `${project.slug} has kind ${kind}, not a platform`);
    }
  }
  for (const kind of projectKinds) {
    assert.ok(
      current.some((project) => project.kinds.includes(kind)),
      `kind ${kind} has no current project, so its tab would be empty`,
    );
  }
  assert.deepEqual(Object.keys(copy.kinds).sort(), [...projectKinds].sort());
});

test("a project whose kinds come from its repository records the file they come from", () => {
  for (const project of projects.filter((project) => project.kindsFrom)) {
    assert.ok(project.repo, `${project.slug} reads its kinds from no repository`);
  }
  // Ink Tools is a suite: its kinds come from its docs/tools.json (scripts/kinds.mjs).
  assert.equal(
    projects.find((project) => project.slug === "ink-tools")?.kindsFrom,
    "docs/tools.json",
  );
});

test("links have unique ids and one of them is email", () => {
  const ids = links.map((link) => link.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(links.some((link) => link.url.startsWith("mailto:")));
});

test("site description fits a search snippet", () => {
  assert.ok(site.description.length <= SEARCH_SNIPPET_MAX, `${site.description.length} characters`);
});

test("the bio only uses the {years} placeholder, counted from a career start in the past", async () => {
  const person = await read("person");
  for (const paragraph of person.bio) {
    for (const [, key] of paragraph.matchAll(/\{(\w+)\}/g)) {
      assert.equal(key, "years", `unknown placeholder {${key}} in the bio`);
    }
  }
  const [year, month] = person.careerStart.split("-").map(Number);
  assert.ok(
    new Date(Date.UTC(year, month - 1)) <= new Date(),
    `careerStart ${person.careerStart} is in the future`,
  );
});

test("a discontinued project says when and why it stopped, and no other project does", () => {
  const fields = ["discontinuedOn", "discontinuedReason", "alternative"];
  for (const project of projects) {
    if (project.status !== "discontinued") {
      for (const field of fields) {
        assert.equal(
          project[field],
          undefined,
          `${project.slug} is ${project.status} with ${field}`,
        );
      }
      continue;
    }
    assert.match(
      project.discontinuedOn ?? "",
      /^\d{4}-(0[1-9]|1[0-2])$/,
      `${project.slug} discontinuedOn`,
    );
    const [year, month] = project.discontinuedOn.split("-").map(Number);
    assert.ok(
      new Date(Date.UTC(year, month - 1)) <= new Date(),
      `${project.slug} stops in the future`,
    );
    assert.ok(project.discontinuedReason?.trim(), `${project.slug} has no discontinuedReason`);
  }
});
