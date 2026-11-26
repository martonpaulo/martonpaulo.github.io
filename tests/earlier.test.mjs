// Invariants of db/earlier.json the schema cannot express (#42). The agreement with the
// archive's folders is scripts/archive-check.mjs, which needs the archive repository.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const read = async (name) =>
  JSON.parse(await readFile(new URL(`../db/${name}.json`, import.meta.url), "utf8"));

const [earlier, projects, copy] = await Promise.all(["earlier", "projects", "copy"].map(read));
const bySlug = new Map(projects.map((project) => [project.slug, project]));

test("every Earlier work entry has a unique folder", () => {
  const slugs = earlier.map((entry) => entry.slug);
  assert.equal(new Set(slugs).size, slugs.length, `duplicate slugs in ${slugs.join(", ")}`);
});

test("an entry names an existing project, and the discontinued projects are exactly those", () => {
  const named = new Set(earlier.map((entry) => entry.project).filter(Boolean));
  for (const slug of named) assert.ok(bySlug.has(slug), `db/earlier.json names unknown ${slug}`);
  for (const project of projects) {
    assert.equal(
      named.has(project.slug),
      project.status === "discontinued",
      `${project.slug} is ${project.status} but ${named.has(project.slug) ? "is" : "is not"} Earlier work`,
    );
  }
});

test("a planned entry is a project, which has a page to link to until its folder exists", () => {
  for (const entry of earlier.filter((entry) => entry.planned)) {
    assert.ok(entry.project, `${entry.slug} is planned without a project page`);
  }
});

test("every kind of a stand-alone entry has a label", () => {
  for (const entry of earlier.filter((entry) => !entry.project)) {
    for (const kind of entry.kinds) assert.ok(copy.kinds[kind], `${entry.slug}: kind ${kind}`);
  }
});

test("the list is written newest first", () => {
  const key = (entry) => entry.period.to * 10_000 + entry.period.from;
  for (let index = 1; index < earlier.length; index++) {
    assert.ok(
      key(earlier[index - 1]) >= key(earlier[index]),
      `${earlier[index].slug} is newer than ${earlier[index - 1].slug}`,
    );
  }
});

test("no project slug takes a path the projects section already uses", () => {
  for (const reserved of ["earlier", "kind"]) assert.ok(!bySlug.has(reserved), reserved);
});
