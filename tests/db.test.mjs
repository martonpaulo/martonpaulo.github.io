// Invariants the schema cannot express. The content loader keys projects by
// slug, so a duplicate would silently overwrite an entry instead of failing.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const read = async (name) =>
  JSON.parse(await readFile(new URL(`../db/${name}.json`, import.meta.url), "utf8"));

const [projects, links, site, copy] = await Promise.all(
  ["projects", "links", "site", "copy"].map(read),
);

const FEATURED_MIN = 3;
const FEATURED_MAX = 9;
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

test("featured projects are few enough for the home page and each has artwork", () => {
  const featured = projects.filter((project) => project.featured);
  assert.ok(
    featured.length >= FEATURED_MIN && featured.length <= FEATURED_MAX,
    `featured: ${featured.length}`,
  );
  for (const project of featured) {
    assert.ok(project.image, `${project.slug} is featured without an image`);
    assert.ok(project.tile, `${project.slug} is featured without a tile colour`);
  }
});

test("every project kind has a label in the copy", () => {
  for (const project of projects) {
    assert.ok(copy.kinds[project.kind], `${project.slug} has kind ${project.kind} without a label`);
  }
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
