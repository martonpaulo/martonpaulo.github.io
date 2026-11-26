// Recomputes the period of every Earlier work entry from its original repository and fails when
// db/earlier.json says otherwise. The rule is in docs/patterns.md, "Earlier work".
//
//   node scripts/earlier-periods.mjs <clones-dir>
//
// <clones-dir> holds one clone per repository, named as on GitHub (a treeless clone is enough:
// `git clone --filter=blob:none --no-checkout`). An entry whose repository is not public, or not
// cloned there, is reported and skipped, never passed.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const say = (line) => process.stdout.write(`${line}\n`);

const read = async (name) =>
  JSON.parse(await readFile(new URL(`../db/${name}.json`, import.meta.url), "utf8"));

const [earlier, projects] = await Promise.all([read("earlier"), read("projects")]);
const bySlug = new Map(projects.map((project) => [project.slug, project]));

/** The owner, as Git records his name; bots and upstream authors of a fork do not count. */
const OWNER = /^Marton( Paulo)?$/;
/** Files that describe a repository rather than make the project. */
const META =
  /^(README|LICENSE|CHANGELOG|CNAME|AGENTS\.md|CLAUDE\.md|\.github\/|docs\/|\.gitignore|\.editorconfig)/i;
/** Subjects of the changes made only to fit the portfolio or the archive. */
const ADAPTATION = /archive|portfolio|martonpaulo\.com|discontinu|martonpss/i;

/** Room for the longest history, Smart Desk's, file names included. */
const LOG_BYTES = 2 ** 26;

const clones = process.argv[2];
if (!clones) {
  console.error("usage: node scripts/earlier-periods.mjs <clones-dir>");
  process.exit(2);
}

/** The first and last year of real work in one repository, or one folder of it. */
function period(dir, folder) {
  const out = execFileSync(
    "git",
    [
      "-C",
      dir,
      "log",
      "--no-merges",
      "--format=%x00%an%x09%ad%x09%s",
      "--date=format:%Y",
      "--name-only",
      "HEAD",
      ...(folder ? ["--", folder] : []),
    ],
    { encoding: "utf8", maxBuffer: LOG_BYTES },
  );
  const years = [];
  for (const chunk of out.split("\0").slice(1)) {
    const [header, ...files] = chunk.split("\n").filter(Boolean);
    const [author, year, subject] = header.split("\t");
    const inFolder = folder ? files.map((file) => file.slice(folder.length + 1)) : files;
    if (!OWNER.test(author) || ADAPTATION.test(subject)) continue;
    if (inFolder.length > 0 && inFolder.every((file) => META.test(file))) continue;
    years.push(Number(year));
  }
  return years.length ? { from: Math.min(...years), to: Math.max(...years) } : null;
}

let failed = 0;
for (const entry of earlier) {
  const source = entry.source ?? bySlug.get(entry.project)?.links.source;
  if (!source) {
    say(`skip ${entry.slug}: no public repository`);
    continue;
  }
  const dir = join(clones, source.split("/").at(-1));
  if (!existsSync(dir)) {
    say(`skip ${entry.slug}: ${dir} is not cloned`);
    continue;
  }
  const found = period(dir, entry.folder);
  const recorded = `${entry.period.from}-${entry.period.to}`;
  const computed = found ? `${found.from}-${found.to}` : "none";
  if (computed !== recorded) {
    say(`DIFFERS ${entry.slug}: recorded ${recorded}, history ${computed}`);
    failed = 1;
  } else say(`ok ${entry.slug} ${recorded}`);
}
process.exit(failed);
