// Records the kinds of a project that lists its own tools, read from that project's repository
// (#43). Ink Tools is a suite: its `docs/tools.json` gives each tool a `kind`, and the site shows
// every kind a public tool has, in the order the file first names it. The kinds are never typed
// here by hand: a project's `kindsFrom` names the file, and this script writes `kinds`.
//
//   node scripts/kinds.mjs           # write the kinds into db/projects.json
//   node scripts/kinds.mjs --check   # fail when db/projects.json differs from the repositories
//
// The file is read from the repository's default branch on GitHub, which answers without a token
// for a public repository. An unreachable file or an unknown kind fails, and nothing is written.
import { readProjects, writeProjects } from "./lib/projects-file.mjs";

/** GitHub's raw file host: <owner>/<repo>/HEAD/<path> is the default branch's copy. */
const RAW = "https://raw.githubusercontent.com/";
/** How a tool's own kind reads as one of the site's kinds (src/content.config.ts, projectKinds). */
const SITE_KIND = {
  plugin: "supernote-plugin",
  app: "supernote-app",
  "Mac app": "macos",
  CLI: "cli",
};
/** A tool the project keeps for its own development, not offered to anyone. */
const INTERNAL = "Internal";

const projects = await readProjects();
const check = process.argv.includes("--check");
const fail = (line) => {
  process.stderr.write(`${line}\n`);
  process.exit(1);
};

let differs = false;
for (const project of projects.filter((p) => p.kindsFrom)) {
  const url = `${RAW}${project.repo}/HEAD/${project.kindsFrom}`;
  const response = await fetch(url);
  if (!response.ok) fail(`${url}: answered ${response.status}; nothing written`);
  const { tools } = await response.json();
  const kinds = [];
  for (const tool of tools.filter((t) => t.status !== INTERNAL)) {
    const kind = SITE_KIND[tool.kind];
    if (!kind) fail(`${url}: ${tool.name} has kind "${tool.kind}", which the site does not map`);
    if (!kinds.includes(kind)) kinds.push(kind);
  }
  if (JSON.stringify(kinds) === JSON.stringify(project.kinds)) continue;
  differs = true;
  process.stdout.write(`${project.slug}: ${project.kinds.join(", ")} -> ${kinds.join(", ")}\n`);
  project.kinds = kinds;
}

if (check) {
  if (differs) fail("db/projects.json differs: run node scripts/kinds.mjs, then pnpm format");
  process.stdout.write("kinds match their repositories\n");
} else {
  await writeProjects(projects);
  process.stdout.write("kinds recorded; run pnpm format to restore the file's wrapping\n");
}
