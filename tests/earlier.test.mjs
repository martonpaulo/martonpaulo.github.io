// Invariants of db/earlier.json the schema cannot express (#42). The agreement with the
// archive's folders is scripts/archive-check.mjs, which needs the archive repository.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import sharp from "sharp";

import { projectSubjects, reservedProjectPaths } from "../src/lib/subjects.ts";

const read = async (name) =>
  JSON.parse(await readFile(new URL(`../db/${name}.json`, import.meta.url), "utf8"));

const [earlier, projects, copy] = await Promise.all(["earlier", "projects", "copy"].map(read));
const bySlug = new Map(projects.map((project) => [project.slug, project]));

test("every Earlier work entry has a unique folder", () => {
  const slugs = earlier.map((entry) => entry.slug);
  assert.equal(new Set(slugs).size, slugs.length, `duplicate slugs in ${slugs.join(", ")}`);
});

// A name is plain and its own: no course or school in parentheses, and no two alike (#50).
test("every project name, current or earlier, is plain and unique", () => {
  const names = [
    ...projects.map((project) => project.name),
    ...earlier.filter((entry) => entry.name).map((entry) => entry.name),
  ];
  for (const name of names) assert.doesNotMatch(name, /[()]/, `${name} has a parenthesis`);
  const seen = new Set();
  for (const name of names) {
    assert.ok(!seen.has(name), `two projects are named ${name}`);
    seen.add(name);
  }
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
  for (const reserved of reservedProjectPaths) assert.ok(!bySlug.has(reserved), reserved);
});

// A subject's tab is /projects/<subject>/ (#70): a reserved name or a project's slug, whose old
// page address redirects there, would make two pages claim one address.
test("no subject takes a reserved path or a project's old page address", () => {
  for (const subject of projectSubjects) {
    assert.ok(!reservedProjectPaths.includes(subject), `${subject} is a reserved path`);
    assert.ok(!bySlug.has(subject), `${subject} is a project's slug`);
  }
});

// Every row shows an icon: the product's own, or one scripts/icons.mjs draws (#43).
test("every entry, current or earlier, has its icon file", () => {
  const icon = (slug) => new URL(`../src/assets/share/${slug}.png`, import.meta.url);
  const current = projects.filter((project) => project.status !== "discontinued");
  for (const slug of [...current.map((p) => p.slug), ...earlier.map((e) => e.project ?? e.slug)]) {
    assert.ok(existsSync(icon(slug)), `src/assets/share/${slug}.png is missing`);
  }
});

// An icon fills its square (#49): no Earlier work icon is a small logo on the old light tile, so
// the middle of each edge, just inside the rounded square, is never that tile's grey.
test("no Earlier work icon is a logo on the old light tile", async () => {
  const OLD_TILE = [0xf4, 0xf4, 0xf5];
  const NEAR = 3;
  const INSET = 6;
  for (const entry of earlier.filter((item) => !item.project)) {
    const file = new URL(`../src/assets/share/${entry.slug}.png`, import.meta.url);
    const { data, info } = await sharp(file.pathname).raw().toBuffer({ resolveWithObject: true });
    const pixel = (x, y) => [...data.subarray((y * info.width + x) * info.channels).subarray(0, 3)];
    const middle = Math.floor(info.width / 2);
    const last = info.width - 1 - INSET;
    const edges = [
      pixel(middle, INSET),
      pixel(middle, last),
      pixel(INSET, middle),
      pixel(last, middle),
    ];
    const grey = edges.filter((rgb) =>
      rgb.every((value, c) => Math.abs(value - OLD_TILE[c]) <= NEAR),
    );
    assert.equal(grey.length, 0, `${entry.slug} sits on the old light tile`);
  }
});
