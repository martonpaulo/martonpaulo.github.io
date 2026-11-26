// scripts/archive-check.mjs over a fixture archive: it passes when the folders and
// db/earlier.json agree, and names the folder that has no entry (#42).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const script = new URL("../scripts/archive-check.mjs", import.meta.url).pathname;
const earlier = JSON.parse(readFileSync(new URL("../db/earlier.json", import.meta.url), "utf8"));

function run(folders) {
  const site = mkdtempSync(join(tmpdir(), "archive-site-"));
  try {
    for (const folder of folders) mkdirSync(join(site, folder));
    return spawnSync(process.execPath, [script, "--site", site], { encoding: "utf8" });
  } finally {
    rmSync(site, { recursive: true, force: true });
  }
}

const built = earlier.filter((entry) => !entry.planned).map((entry) => entry.slug);

test("the archive and the list agree", () => {
  assert.equal(run(built).status, 0);
});

test("a folder with no entry fails and is named", () => {
  const result = run([...built, "new-exercise"]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /UNLISTED new-exercise/);
});

test("an entry with no folder that is not planned fails", () => {
  const result = run(built.slice(1));
  assert.equal(result.status, 1);
  assert.match(result.stdout, new RegExp(`MISSING ${built[0]}`));
});

// The live archive, as CI reads it when the private repository is refused: 200 at a folder,
// a redirect anywhere else (#42).
async function runLive(answer, { args = ["--live"], env = process.env } = {}) {
  const { createServer } = await import("node:http");
  const { spawn } = await import("node:child_process");
  const server = createServer((request, response) => {
    const slug = request.url.split("/")[1];
    response.writeHead(answer(slug), { location: "https://example.invalid/404/" }).end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}/`;
  try {
    const child = spawn(process.execPath, [script, ...args, "--base", base], { env });
    let stdout = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    const status = await new Promise((resolve) => child.on("close", resolve));
    return { status, stdout };
  } finally {
    server.close();
  }
}

test("live: the archive and the list agree", async () => {
  const result = await runLive((slug) => (built.includes(slug) ? 200 : 301));
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /archive check OK, live/);
});

test("live: an entry whose folder redirects away fails", async () => {
  const result = await runLive((slug) => (built.includes(slug) && slug !== built[0] ? 200 : 301));
  assert.equal(result.status, 1);
  assert.match(result.stdout, new RegExp(`MISSING ${built[0]}`));
});

test("live: a planned entry that already answers fails", async () => {
  const planned = earlier.find((entry) => entry.planned).slug;
  const result = await runLive((slug) => (built.includes(slug) || slug === planned ? 200 : 301));
  assert.equal(result.status, 1);
  assert.match(result.stdout, new RegExp(`PLANNED ${planned}`));
});

test("live: an error answer fails and is never read as absent", async () => {
  const result = await runLive((slug) =>
    slug === built[0] ? 500 : built.includes(slug) ? 200 : 301,
  );
  assert.equal(result.status, 1);
  assert.match(result.stdout, new RegExp(`UNREAD ${built[0]}`));
  assert.doesNotMatch(result.stdout, /MISSING/);
});

test("a refused clone falls back to the live archive instead of crashing", async () => {
  // Points the archive's URL at a folder that does not exist, as CI's missing token does.
  const env = {
    ...process.env,
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "url./nonexistent-archive/.insteadOf",
    GIT_CONFIG_VALUE_0: "https://github.com/martonpaulo/",
  };
  const result = await runLive((slug) => (built.includes(slug) ? 200 : 301), { args: [], env });
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /not readable here/);
  assert.match(result.stdout, /archive check OK, live/);
});

// A clone that holds a folder the live archive still redirects away, as when the archive's
// Cloudflare rule does not yet let a new folder through: the entry stays planned (#43).
function fixtureArchive(folders) {
  const root = mkdtempSync(join(tmpdir(), "archive-repo-"));
  const repo = join(root, "archive.git");
  const git = (...args) =>
    spawnSync("git", [
      "-C",
      repo,
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.invalid",
      ...args,
    ]);
  mkdirSync(repo);
  git("init", "-q");
  for (const folder of folders) {
    mkdirSync(join(repo, "site", folder), { recursive: true });
    writeFileSync(join(repo, "site", folder, "index.html"), "");
  }
  git("add", ".");
  git("commit", "-q", "--no-gpg-sign", "-m", "fixture");
  const env = {
    ...process.env,
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: `url.file://${root}/.insteadOf`,
    GIT_CONFIG_VALUE_0: "https://github.com/martonpaulo/",
  };
  return { root, env };
}

test("clone: a folder whose live address redirects away keeps its entry planned", async () => {
  const planned = earlier.find((entry) => entry.planned).slug;
  const { root, env } = fixtureArchive([...built, planned]);
  try {
    const served = (slug) => (built.includes(slug) ? 200 : 301);
    const kept = await runLive(served, { args: [], env });
    assert.equal(kept.status, 0, kept.stdout);
    assert.match(kept.stdout, /archive check OK \(/);
    const hidden = await runLive((slug) => (slug === built[0] ? 301 : served(slug)), {
      args: [],
      env,
    });
    assert.equal(hidden.status, 1);
    assert.match(
      hidden.stdout,
      new RegExp(`MISSING ${built[0]}: the archive repository has its folder`),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
