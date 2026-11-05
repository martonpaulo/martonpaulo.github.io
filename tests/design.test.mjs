// The design files published under /design/ (issue #32) are a contract with other sites:
// every token the site declares must reach tokens.css, and the manifest must describe the
// bytes actually served. The module is TypeScript; Node strips the types on import.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { designFiles, manifestFor } from "../src/lib/design.ts";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const decode = (bytes) => new TextDecoder().decode(bytes);
const fileAt = (path) => designFiles().find((file) => file.path === path);

test("every custom property declared in tokens.scss appears in tokens.css", async () => {
  const source = await readFile(new URL("../src/styles/tokens.scss", import.meta.url), "utf8");
  const declared = new Set([...source.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
  assert.ok(declared.size > 0, "no custom property found in tokens.scss");
  const css = decode(fileAt("tokens.css").bytes);
  for (const name of declared) {
    assert.match(css, new RegExp(`${name}\\s*:`), `${name} is missing from tokens.css`);
  }
  assert.match(css, /@media \(min-width: 112rem\)/, "the ultrawide rule is missing");
});

test("fonts.css points only at published font files", () => {
  const css = decode(fileAt("fonts.css").bytes);
  const urls = [...css.matchAll(/url\("([^"]+)"\)/g)].map((match) => match[1]);
  assert.equal(urls.length, 2);
  for (const url of urls) assert.ok(fileAt(url), `${url} is not published`);
  assert.equal(css.match(/font-display: swap/g)?.length, 2);
});

test("every font file sits beside its licence", () => {
  for (const file of designFiles().filter((candidate) => candidate.path.endsWith(".woff2"))) {
    const family = file.path.slice("fonts/".length).split("-")[0];
    const licence = fileAt(`fonts/${family}-OFL.txt`);
    assert.ok(licence, `${file.path} has no licence beside it`);
    assert.match(decode(licence.bytes), /SIL Open Font License/);
  }
});

test("every manifest hash matches its file", () => {
  const files = designFiles();
  for (const entry of manifestFor(files, "test").files) {
    const file = files.find((candidate) => candidate.path === entry.path);
    assert.equal(entry.bytes, file.bytes.byteLength, entry.path);
    assert.equal(entry.sha256, sha256(file.bytes), entry.path);
  }
});

// `pnpm validate` tests before it builds, so this part runs only when a build is present.
const built = new URL("../dist/design/", import.meta.url);
test(
  "the built manifest matches the built files",
  { skip: !existsSync(new URL("manifest.json", built)) && "no build in dist/" },
  async () => {
    const manifest = JSON.parse(await readFile(new URL("manifest.json", built), "utf8"));
    assert.match(manifest.commit, /^[0-9a-f]{40}$/);
    assert.equal(manifest.files.length, designFiles().length);
    for (const entry of manifest.files) {
      const bytes = await readFile(new URL(entry.path, built));
      assert.equal(entry.bytes, bytes.byteLength, entry.path);
      assert.equal(entry.sha256, sha256(bytes), entry.path);
    }
  },
);
