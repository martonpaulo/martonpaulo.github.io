// Checks the built site for what keeps Earlier work out of search (#42). Run after `pnpm build`.
//
//   node scripts/earlier-build-check.mjs [dist]
//
// The Earlier work tab and every project page it lists ask for noindex and are not in the
// sitemap; no page links the archive's root, which serves nothing; and no current list names an
// Earlier work project.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

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

const earlierNames = projects
  .filter((p) => p.status === "discontinued")
  .map((p) => `/projects/${p.slug}/`);
for (const path of [
  "/",
  "/projects/",
  ...readdirSync(join(dist, "projects/kind")).map((k) => `/projects/kind/${k}/`),
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

for (const line of problems) say(line);
if (problems.length) process.exit(1);
say(`earlier build check OK (${unlisted.length} unlisted pages)`);
