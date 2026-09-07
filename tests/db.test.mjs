// Invariants the build cannot catch: the content loader keys projects by slug,
// so a duplicate would silently overwrite an entry instead of failing.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const db = JSON.parse(await readFile(new URL("../db.json", import.meta.url), "utf8"));

test("every project has a unique slug", () => {
  const slugs = db.projects.map((project) => project.slug);
  assert.equal(new Set(slugs).size, slugs.length, `duplicate slugs in ${slugs.join(", ")}`);
});

test("every project has at least one link", () => {
  for (const project of db.projects) {
    assert.ok(
      Object.values(project.links).some(Boolean),
      `${project.slug} has no live, source, or package link`,
    );
  }
});

test("featured projects are few enough to fit the home page", () => {
  const featured = db.projects.filter((project) => project.featured);
  assert.ok(featured.length >= 3 && featured.length <= 8, `featured: ${featured.length}`);
});

test("links have unique ids and at least one primary", () => {
  const ids = db.links.map((link) => link.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(db.links.some((link) => link.primary));
});

test("site description fits a search snippet", () => {
  assert.ok(db.site.description.length <= 160, `${db.site.description.length} characters`);
});
