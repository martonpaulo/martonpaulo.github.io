// Records each current project's GitHub figures in db/projects.json as `metrics` (#43): the
// inputs of the score that orders the home page and the Projects list (`projectScores()` in
// src/lib/status.ts). The build reads only these recorded numbers and never the network, so the
// same data always gives the same order.
//
//   GH_TOKEN=<token> node scripts/metrics.mjs
//
// A token lets private repositories count; without one they cannot be read, and the script stops
// rather than write a zero it did not see.
import { readProjects, writeProjects } from "./lib/projects-file.mjs";

/** GitHub's REST API. */
const API = "https://api.github.com/";
/** The window of "recent activity", in days, counted back from the day the figures are read. */
const RECENT_DAYS = 90;
const DAY_MS = 86_400_000;
const PAGE = 100;
const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
const headers = {
  accept: "application/vnd.github+json",
  ...(token ? { authorization: `Bearer ${token}` } : {}),
};
const say = (line) => process.stdout.write(`${line}\n`);

async function get(path) {
  const response = await fetch(`${API}${path}`, { headers });
  if (!response.ok) {
    process.stderr.write(`${path}: GitHub answered ${response.status}; nothing written\n`);
    process.exit(1);
  }
  return response;
}

/** How many commits the default branch holds (since `since`, when given): the last page's number. */
async function commitCount(repo, since) {
  const query = `per_page=1${since ? `&since=${since}` : ""}`;
  const response = await get(`repos/${repo}/commits?${query}`);
  const last = /[?&]page=(\d+)>; rel="last"/.exec(response.headers.get("link") ?? "");
  return last ? Number(last[1]) : (await response.json()).length;
}

/** Every release's asset downloads, and whether any release has a file to download. */
async function releases(repo) {
  let downloads = 0;
  let release = false;
  for (let page = 1; ; page += 1) {
    const list = await (await get(`repos/${repo}/releases?per_page=${PAGE}&page=${page}`)).json();
    for (const { assets } of list) {
      if (assets.length) release = true;
      for (const asset of assets) downloads += asset.download_count;
    }
    if (list.length < PAGE) return { downloads, release };
  }
}

const projects = await readProjects();
const at = new Date().toISOString().slice(0, 10);
const since = new Date(Date.parse(at) - RECENT_DAYS * DAY_MS).toISOString();
for (const project of projects.filter((p) => p.status !== "discontinued")) {
  const repo = await (await get(`repos/${project.repo}`)).json();
  const closed = await (
    await get(`search/issues?q=${encodeURIComponent(`repo:${project.repo} is:issue is:closed`)}`)
  ).json();
  const metrics = {
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    ...(await releases(project.repo)),
    public: !repo.private,
    closedIssues: closed.total_count,
    commits: await commitCount(project.repo),
    recentCommits: await commitCount(project.repo, since),
    at,
  };
  say(`${project.slug}: ${JSON.stringify(metrics)}`);
  delete project.stars;
  project.metrics = metrics;
}
await writeProjects(projects);
say("metrics recorded; run pnpm format to restore the file's wrapping");
