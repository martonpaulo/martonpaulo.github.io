// A project row's icon has one size (#66): the token in ProjectRow.scss sets it, and the image's
// source widths in src/lib/images.ts follow it, so the file is never drawn larger than it is.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

/** CSS pixels in one rem, the browser default the site does not change. */
const REM = 16;
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("ROW_ICON_SIZE follows the row icon token", async () => {
  const scss = await read("src/components/ProjectRow.scss");
  const images = await read("src/lib/images.ts");
  const token = scss.match(/--project-row-icon:\s*([\d.]+)rem;/);
  const size = images.match(/export const ROW_ICON_SIZE = (\d+);/);
  assert.ok(token, "--project-row-icon is not set in rem in ProjectRow.scss");
  assert.ok(size, "ROW_ICON_SIZE is missing from src/lib/images.ts");
  assert.equal(Number(size[1]), Number(token[1]) * REM);
});
