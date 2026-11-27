// The highlighted phrases of a text (#56): src/lib/copy.ts cuts the text into runs, and every phrase
// the data marks must be in its text.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { markRuns } from "../src/lib/copy.ts";

const person = JSON.parse(await readFile(new URL("../db/person.json", import.meta.url), "utf8"));

test("the runs keep the whole text and mark each phrase once", () => {
  const runs = markRuns("I build tools; your data stays home.", ["your data stays home"]);
  assert.deepEqual(runs, [
    { text: "I build tools; ", mark: false },
    { text: "your data stays home", mark: true },
    { text: ".", mark: false },
  ]);
});

test("a phrase the text does not hold fails", () => {
  assert.throws(() => markRuns("Plain text.", ["missing"]), /not in/);
});

test("the home intro holds both highlighted phrases", () => {
  const runs = markRuns(person.intro, person.introMarks);
  assert.equal(runs.filter((run) => run.mark).length, 2);
  assert.equal(runs.map((run) => run.text).join(""), person.intro);
});

test("the highlight is square on every wrapped line (#60)", async () => {
  const css = await readFile(new URL("../src/styles/base.scss", import.meta.url), "utf8");
  const rule = css.match(/\nmark \{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(
    rule,
    /border-radius/,
    "a radius comes from tokens.scss, and the mark takes none",
  );
  assert.match(rule, /box-decoration-break:\s*clone;/);
});
