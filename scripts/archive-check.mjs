// Fails when db/earlier.json and the folders of martonpaulo/portfolio-archive's site/ disagree
// (#42): a folder with no entry, or an entry with no folder that is not marked planned.
//
//   node scripts/archive-check.mjs [--site DIR]
//
// Without --site it makes a shallow, treeless clone of the archive (no token, no API limit).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const say = (line) => process.stdout.write(`${line}\n`);

const ARCHIVE = "https://github.com/martonpaulo/portfolio-archive.git";
const earlier = JSON.parse(readFileSync(new URL("../db/earlier.json", import.meta.url), "utf8"));

function folders() {
  const at = process.argv.indexOf("--site");
  if (at !== -1) {
    return readdirSync(process.argv[at + 1], { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  }
  const dir = mkdtempSync(join(tmpdir(), "archive-check-"));
  try {
    execFileSync("git", [
      "clone",
      "-q",
      "--depth=1",
      "--filter=blob:none",
      "--no-checkout",
      ARCHIVE,
      dir,
    ]);
    const out = execFileSync("git", ["-C", dir, "ls-tree", "-d", "--name-only", "HEAD", "site/"], {
      encoding: "utf8",
    });
    return out
      .split("\n")
      .filter(Boolean)
      .map((path) => path.slice("site/".length));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const present = new Set(folders());
if (present.size === 0) {
  console.error("the archive lists no folder; refusing to pass on an empty list");
  process.exit(1);
}
const listed = new Set(earlier.map((entry) => entry.slug));
const problems = [
  ...[...present]
    .filter((slug) => !listed.has(slug))
    .map((slug) => `UNLISTED ${slug}: archive folder with no entry in db/earlier.json`),
  ...earlier
    .filter((entry) => !present.has(entry.slug) && !entry.planned)
    .map((entry) => `MISSING ${entry.slug}: no archive folder and not planned`),
  ...earlier
    .filter((entry) => present.has(entry.slug) && entry.planned)
    .map((entry) => `PLANNED ${entry.slug}: already archived, drop "planned"`),
];
for (const line of problems) say(line);
if (problems.length) process.exit(1);
say(`archive check OK (${present.size} folders, ${listed.size} entries)`);
