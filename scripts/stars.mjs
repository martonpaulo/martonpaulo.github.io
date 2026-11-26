// Records each current project's GitHub star count in db/projects.json (#43). The home page
// shows the six with the most stars, so the build reads this number and never the network.
//
//   GH_TOKEN=<token> node scripts/stars.mjs
//
// A token lets private repositories count; without one they cannot be read, and the script stops
// rather than write a zero it did not see.
import { readFile, writeFile } from "node:fs/promises";

/** GitHub's REST endpoint for one repository. */
const API = "https://api.github.com/repos/";
const file = new URL("../db/projects.json", import.meta.url);
const projects = JSON.parse(await readFile(file, "utf8"));
const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
const headers = {
  accept: "application/vnd.github+json",
  ...(token ? { authorization: `Bearer ${token}` } : {}),
};
const say = (line) => process.stdout.write(`${line}\n`);

for (const project of projects.filter((p) => p.status !== "discontinued")) {
  const response = await fetch(`${API}${project.repo}`, { headers });
  if (!response.ok) {
    process.stderr.write(`${project.repo}: GitHub answered ${response.status}; nothing written\n`);
    process.exit(1);
  }
  const { stargazers_count: stars } = await response.json();
  if (project.stars !== stars) say(`${project.slug}: ${project.stars ?? "none"} -> ${stars}`);
  project.stars = stars;
}
await writeFile(file, `${JSON.stringify(projects, null, 2)}\n`);
say("stars recorded; run pnpm format to restore the file's wrapping");
