// Checks the built site for what keeps Earlier work out of search (#42). Run after `pnpm build`.
//
//   node scripts/earlier-build-check.mjs [dist]
//
// The Earlier work tab and every project page it lists ask for noindex and are not in the
// sitemap; no page links the archive's root, which serves nothing; no current list names an
// Earlier work project; the home page and the Projects list follow the score (#43); a
// project with its own site has no page and every list leads to that site (#57); and no page links
// the repository of a project that has no public source link. Every indexed page's meta
// description keeps the length search engines show whole (#59). A subject folded into another
// leaves a redirect page that is not in the sitemap (#69).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { descriptionLength } from "../src/lib/descriptions.ts";
import { homeProjects, rankedProjects } from "../src/lib/status.ts";
import { mergedSubjects, projectSubjects } from "../src/lib/subjects.ts";
import { hasPage, pagePath, projectTarget } from "../src/lib/targets.ts";

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
const inSitemap = (path) => sitemap.includes(`<loc>${new URL(path, site.url)}</loc>`);
for (const path of unlisted) {
  if (!NOINDEX.test(page(path))) problems.push(`INDEXED ${path}: no noindex meta`);
  if (inSitemap(path)) problems.push(`IN SITEMAP ${path}`);
}

// Every subject tab is a listed page; a filter that matched part of a path once dropped Design (#43).
const subjectTabs = projectSubjects.map((subject) => `/projects/subject/${subject}/`);
for (const path of subjectTabs) {
  if (!inSitemap(path)) problems.push(`NOT IN SITEMAP ${path}`);
}

// A subject folded into Productivity leaves its old tab as a redirect page to it, unlisted (#69).
for (const subject of mergedSubjects) {
  const path = `/projects/subject/${subject}/`;
  const html = page(path);
  if (!html.includes('http-equiv="refresh" content="0;url=/projects/subject/productivity/"'))
    problems.push(`REDIRECT ${path}: does not lead to the Productivity tab`);
  if (!NOINDEX.test(html)) problems.push(`INDEXED ${path}: no noindex meta`);
  if (inSitemap(path)) problems.push(`IN SITEMAP ${path}`);
}

// A row's meta is a list: one platform per item, then the year, with no divider (#55).
for (const path of ["/projects/", "/projects/earlier/"]) {
  for (const [, meta] of page(path).matchAll(/<ul class="project-row__meta"[^>]*>(.*?)<\/ul>/g)) {
    if (meta.includes("·")) problems.push(`DIVIDER ${path}: a row's meta has a « · »`);
  }
}
const ink = projects.find((p) => p.slug === "ink-tools");
const list = page("/projects/");
const inkAt = list.indexOf(`href="${projectTarget(ink).href}"`);
const inkMeta = /<ul class="project-row__meta"[^>]*>(.*?)<\/ul>/s.exec(list.slice(inkAt))?.[1];
const inkLines = (inkMeta ?? "").match(/<li>/g)?.length ?? 0;
const inkKinds = ink.kinds.length;
if (inkLines !== inkKinds + 1)
  problems.push(`META ink-tools: ${inkLines} lines, not its ${inkKinds} platforms and the year`);

const earlierNames = projects
  .filter((p) => p.status === "discontinued")
  .map((p) => `/projects/${p.slug}/`);
for (const path of ["/", "/projects/", ...subjectTabs]) {
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

// A project with a site of its own has no page here, and every current list leads to that site;
// only a current project without one has a page, at /<slug>/, and the lists lead there (#57).
const lists = ["/", "/projects/", ...subjectTabs];
for (const project of projects) {
  const built = existsSync(join(dist, project.slug, "index.html"));
  if (built !== hasPage(project)) {
    problems.push(`PAGE ${pagePath(project)}: ${built ? "built" : "missing"} for ${project.slug}`);
  }
  if (project.status === "discontinued") continue;
  const { href } = projectTarget(project);
  for (const path of lists) {
    const html = page(path);
    if (html.includes(`href="/projects/${project.slug}/"`))
      problems.push(`OLD LINK ${path} links /projects/${project.slug}/`);
  }
  if (!list.includes(`href="${href}"`))
    problems.push(`TARGET /projects/: ${project.slug} does not lead to ${href}`);
}

// The home page shows the six current projects with the highest score, and the Projects list
// every current one, in score order (#43).
const home = [
  ...page("/").matchAll(
    /class="project-card"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*class="project-card"/g,
  ),
].map((match) => match[1] ?? match[2]);
const expected = homeProjects(projects, site.url).map((project) => projectTarget(project).href);
if (home.join() !== expected.join())
  problems.push(`HOME ORDER ${home.join()} is not ${expected.join()}`);
const listed = [...list.matchAll(/class="project-row__icon-link"\s+href="([^"]+)"/g)].map(
  (match) => match[1],
);
const ranked = rankedProjects(projects, site.url).map((project) => projectTarget(project).href);
if (listed.join() !== ranked.join())
  problems.push(`LIST ORDER ${listed.join()} is not ${ranked.join()}`);

// A project with no public source link is never linked to its repository (#43).
const privateRepos = projects
  .filter((p) => p.repo && !p.links.source)
  .map((p) => `github.com/${p.repo}`);
for (const file of walk(dist)) {
  const html = readFileSync(file, "utf8");
  for (const repo of privateRepos)
    if (html.includes(repo)) problems.push(`PRIVATE ${file}: names ${repo}`);
}

// Every indexed page's meta description fits the length rule; a noindex page is never shown (#59).
const DESCRIPTION = /<meta name="description" content="([^"]*)"/;
const decoded = (text) =>
  text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
let described = 0;
for (const file of walk(dist)) {
  const html = readFileSync(file, "utf8");
  if (NOINDEX.test(html)) continue;
  const content = DESCRIPTION.exec(html)?.[1];
  if (content === undefined) {
    problems.push(`NO DESCRIPTION ${file}`);
    continue;
  }
  const { length } = decoded(content);
  described += 1;
  if (length < descriptionLength.min || length > descriptionLength.max)
    problems.push(
      `DESCRIPTION ${file}: ${length} characters, not ${descriptionLength.min} to ${descriptionLength.max}`,
    );
}

for (const line of problems) say(line);
if (problems.length) process.exit(1);
say(`earlier build check OK (${unlisted.length} unlisted pages, ${described} descriptions)`);
