// Labels read as plain words (#61): no bracket around an eyebrow, and several items in one label
// joined by the one separator in src/lib/copy.ts, never by a middle dot.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { LABEL_SEPARATOR, labelOf } from "../src/lib/copy.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("several items of one label are joined by a comma", () => {
  assert.equal(LABEL_SEPARATOR, ", ");
  assert.equal(labelOf(["Supernote plugin", "macOS app"]), "Supernote plugin, macOS app");
});

test("no style draws a bracket around a label", async () => {
  const dir = new URL("src/components/", root);
  for (const name of (await readdir(dir)).filter((file) => file.endsWith(".scss"))) {
    const scss = await readFile(new URL(name, dir), "utf8");
    assert.doesNotMatch(scss, /content:\s*"\s*[[\]]/, `${name} draws a bracket`);
  }
});

test("no label text in db/copy.json or the components uses a middle dot divider", async () => {
  const sources = ["db/copy.json", "src/lib/person.ts", "src/components/KindLabels.astro"];
  for (const path of sources) assert.doesNotMatch(await read(path), / · /, path);
});

// `pnpm validate` tests before it builds, so this part runs only when a build is present.
const built = new URL("dist/", root);
test(
  "no built eyebrow holds a bracket or a middle dot",
  { skip: !existsSync(new URL("index.html", built)) && "no build in dist/" },
  async () => {
    const pages = (await readdir(built, { recursive: true })).filter((path) =>
      path.endsWith(".html"),
    );
    let eyebrows = 0;
    for (const path of pages) {
      const html = await readFile(new URL(path, built), "utf8");
      for (const match of html.matchAll(/class="[^"]*\beyebrow\b[^"]*"[^>]*>/g)) {
        // The label's text: up to the next block or link boundary, its inner spans stripped.
        const after = html.slice(match.index + match[0].length);
        const end = after.search(/<\/?(?:p|div|h[1-6]|a|header|article)\b/);
        const text = after.slice(0, end < 0 ? undefined : end).replace(/<[^>]+>/g, "");
        eyebrows += 1;
        assert.doesNotMatch(text, /[·[\]]/, `${path}: ${text}`);
      }
    }
    assert.ok(eyebrows > 0, "no eyebrow found in dist/");
  },
);
