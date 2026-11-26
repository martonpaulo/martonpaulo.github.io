// scripts/archive-check.mjs over a fixture archive: it passes when the folders and
// db/earlier.json agree, and names the folder that has no entry (#42).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
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
