// Fails when db/earlier.json and the archive disagree (#42): a folder with no entry, an entry
// with no folder that is not marked planned, or a planned entry that is already archived.
//
//   node scripts/archive-check.mjs [--site DIR | --live [--base URL]]
//
// The folders come from, in order: --site DIR; a shallow, treeless clone of the private
// martonpaulo/archive, which works wherever git can read it (the Mac, a cloud session);
// else the live archive. CI has no token for that private repository, so there the clone is
// refused and the check reads each entry's live address instead. The live archive answers 200 at
// a project folder and redirects every other path, so it proves each entry but cannot list a
// folder that has no entry; that direction is checked only by the clone.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const say = (line) => process.stdout.write(`${line}\n`);
const argument = (name) => {
  const at = process.argv.indexOf(name);
  return at === -1 ? undefined : process.argv[at + 1];
};

const ARCHIVE = "https://github.com/martonpaulo/archive.git";
const FOLDER_ANSWER = 200;
// The archive's answer off a folder: a 3xx redirect to martonpaulo.com/404.
const REDIRECT_FIRST = 300;
const REDIRECT_LAST = 399;
const isRedirect = (status) => status >= REDIRECT_FIRST && status <= REDIRECT_LAST;
const earlier = JSON.parse(readFileSync(new URL("../db/earlier.json", import.meta.url), "utf8"));
const site = JSON.parse(readFileSync(new URL("../db/site.json", import.meta.url), "utf8"));

function siteFolders(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function clonedFolders() {
  const dir = mkdtempSync(join(tmpdir(), "archive-check-"));
  try {
    const quiet = { env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }, stdio: "pipe" };
    execFileSync(
      "git",
      ["clone", "-q", "--depth=1", "--filter=blob:none", "--no-checkout", ARCHIVE, dir],
      quiet,
    );
    const out = execFileSync("git", ["-C", dir, "ls-tree", "-d", "--name-only", "HEAD", "site/"], {
      ...quiet,
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

// Each entry's live status: true when its folder answers 200, false when the archive redirects
// it away. Any other answer, or no answer, fails the check: it is never read as "absent".
async function liveFolders(base) {
  const present = new Set();
  const unread = new Set();
  const problems = [];
  await Promise.all(
    earlier.map(async (entry) => {
      const url = new URL(`${entry.slug}/`, base);
      try {
        const response = await fetch(url, { redirect: "manual" });
        if (response.status === FOLDER_ANSWER) present.add(entry.slug);
        else if (!isRedirect(response.status)) {
          unread.add(entry.slug);
          problems.push(`UNREAD ${entry.slug}: ${url} answers ${response.status}`);
        }
      } catch (error) {
        unread.add(entry.slug);
        problems.push(
          `UNREAD ${entry.slug}: ${url} gave no answer (${error.cause?.code ?? error.message})`,
        );
      }
    }),
  );
  return { present, unread, problems };
}

async function source() {
  const dir = argument("--site");
  if (dir)
    return { present: new Set(siteFolders(dir)), complete: true, unread: new Set(), problems: [] };
  if (!process.argv.includes("--live")) {
    try {
      return { present: new Set(clonedFolders()), complete: true, unread: new Set(), problems: [] };
    } catch (error) {
      const reason = String(error.stderr ?? error.message)
        .trim()
        .split("\n")
        .pop();
      say(`archive repository not readable here (${reason}); checking the live archive instead`);
    }
  }
  const base = argument("--base") ?? site.archive;
  return { ...(await liveFolders(base)), complete: false };
}

const { present, complete, unread, problems } = await source();
if (present.size === 0) {
  console.error("the archive shows no folder; refusing to pass on an empty list");
  process.exit(1);
}
const listed = new Set(earlier.map((entry) => entry.slug));
problems.push(
  ...[...present]
    .filter((slug) => !listed.has(slug))
    .map((slug) => `UNLISTED ${slug}: archive folder with no entry in db/earlier.json`),
  ...earlier
    .filter((entry) => !present.has(entry.slug) && !unread.has(entry.slug) && !entry.planned)
    .map((entry) => `MISSING ${entry.slug}: no archive folder and not planned`),
  ...earlier
    .filter((entry) => present.has(entry.slug) && entry.planned)
    .map((entry) => `PLANNED ${entry.slug}: already archived, drop "planned"`),
);
for (const line of problems.sort()) say(line);
if (problems.length) process.exit(1);
say(
  complete
    ? `archive check OK (${present.size} folders, ${listed.size} entries)`
    : `archive check OK, live (${present.size} folders answer, ${listed.size} entries; a folder with no entry is not visible live)`,
);
