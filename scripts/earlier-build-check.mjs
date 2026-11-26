// Checks the built site for what keeps Earlier work out of search (#42). Run after `pnpm build`.
//
//   node scripts/earlier-build-check.mjs [dist]
//
// The Earlier work tab and every project page it lists ask for noindex and are not in the
// sitemap; no page links the archive's root, which serves nothing; no current list names an
// Earlier work project; the home page shows the six most-starred projects in order (#43); and
// no page links the repository of a project that has no public source link.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { homeProjects } from "../src/lib/status.ts";

const say = (line) => process.stdout.write(`${line}\n`);

const dist = process.argv[2] ?? "dist";
const read = (name) =>
  JSON.parse(readFileSync(new URL(`../db/${name}.json`, import.meta.url), "utf8"));
const [earlier, projects, site] = [read("earlier"), read("projects"), read("site")];
const NOINDEX = /<meta name="robots" content="noindex[^"]*"/;

const problems = [];
const page = (path) => {
  const file = join(dist, path, "index.html");
  if (!existsSync(file)) {
    problems.push(`MISSING ${path}`);
    return "";
  }
  return readFileSync(file, "utf8");
};

const unlisted = [
  "/projects/earlier/",
  ...earlier.filter((e) => e.project).map((e) => `/projects/${e.project}/`),
];
const sitemap = readdirSync(dist)
  .filter((name) => /^sitemap-\d+\.xml$/.test(name))
  .map((name) => readFileSync(join(dist, name), "utf8"))
  .join("\n");
if (!sitemap) problems.push("NO SITEMAP in " + dist);
for (const path of unlisted) {
  if (!NOINDEX.test(page(path))) problems.push(`INDEXED ${path}: no noindex meta`);
  if (sitemap.includes(`<loc>${new URL(path, site.url)}</loc>`))
    problems.push(`IN SITEMAP ${path}`);
}

// Every subject tab is a listed page; a filter that matched part of a path once dropped Design (#43).
for (const subject of readdirSync(join(dist, "projects/subject"))) {
  const path = `/projects/subject/${subject}/`;
  if (!sitemap.includes(`<loc>${new URL(path, site.url)}</loc>`))
    problems.push(`NOT IN SITEMAP ${path}`);
}

// A row's meta is a list: one platform per item, then the year, with no divider (#55).
for (const path of ["/projects/", "/projects/earlier/"]) {
  for (const [, meta] of page(path).matchAll(/<ul class="project-row__meta"[^>]*>(.*?)<\/ul>/g)) {
    if (meta.includes("·")) problems.push(`DIVIDER ${path}: a row's meta has a « · »`);
  }
}
const inkMeta =
  /href="\/projects\/ink-tools\/".*?<ul class="project-row__meta"[^>]*>(.*?)<\/ul>/s.exec(
    page("/projects/"),
  )?.[1];
const inkLines = (inkMeta ?? "").match(/<li>/g)?.length ?? 0;
const inkKinds = projects.find((p) => p.slug === "ink-tools")?.kinds.length ?? 0;
if (inkLines !== inkKinds + 1)
  problems.push(`META ink-tools: ${inkLines} lines, not its ${inkKinds} platforms and the year`);

const earlierNames = projects
  .filter((p) => p.status === "discontinued")
  .map((p) => `/projects/${p.slug}/`);
for (const path of [
  "/",
  "/projects/",
  ...readdirSync(join(dist, "projects/subject")).map((s) => `/projects/subject/${s}/`),
]) {
  const html = page(path);
  for (const href of earlierNames)
    if (html.includes(`href="${href}"`)) problems.push(`CURRENT LIST ${path} links ${href}`);
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(join(dir, entry.name))
      : entry.name.endsWith(".html")
        ? [join(dir, entry.name)]
        : [],
  );
for (const file of walk(dist)) {
  if (readFileSync(file, "utf8").includes(`href="${site.archive}"`))
    problems.push(`ROOT LINK ${file}: links ${site.archive}`);
}

// The home page shows the six most-starred current projects, in that order (#43).
const home = [
  ...page("/").matchAll(
    /class="project-card"[^>]*href="\/projects\/([^/"]+)\/"|href="\/projects\/([^/"]+)\/"[^>]*class="project-card"/g,
  ),
].map((match) => match[1] ?? match[2]);
const expected = homeProjects(projects).map((project) => project.slug);
if (home.join() !== expected.join())
  problems.push(`HOME ORDER ${home.join()} is not ${expected.join()}`);

// A project with no public source link is never linked to its repository (#43).
const privateRepos = projects
  .filter((p) => p.repo && !p.links.source)
  .map((p) => `github.com/${p.repo}`);
for (const file of walk(dist)) {
  const html = readFileSync(file, "utf8");
  for (const repo of privateRepos)
    if (html.includes(repo)) problems.push(`PRIVATE ${file}: names ${repo}`);
}

for (const line of problems) say(line);
if (problems.length) process.exit(1);
say(`earlier build check OK (${unlisted.length} unlisted pages)`);
