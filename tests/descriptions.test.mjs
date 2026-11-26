// The meta description length rule and how a long description gives way (#59).
import assert from "node:assert/strict";
import { test } from "node:test";

import { descriptionLength, firstThatFits } from "../src/lib/descriptions.ts";

const sized = (length) => "x".repeat(length);

test("the longest wording that fits wins", () => {
  const fits = sized(descriptionLength.max);
  assert.equal(firstThatFits([sized(descriptionLength.max + 1), fits, sized(120)]), fits);
});

test("a wording that already fits is kept whole", () => {
  const full = sized(130);
  assert.equal(firstThatFits([full, sized(115)]), full);
});

test("when nothing fits, the shortest is returned for the build check to name", () => {
  const shortest = sized(descriptionLength.max + 1);
  assert.equal(firstThatFits([sized(descriptionLength.max + 9), shortest]), shortest);
});
