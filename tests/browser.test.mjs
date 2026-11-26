// scripts/lib/browser.mjs: the page checks find a Chrome on a Mac whose only one is Chrome for
// Testing, with or without $SKD_CHROME.
import assert from "node:assert/strict";
import { test } from "node:test";

import { fallbackChrome } from "../scripts/lib/browser.mjs";

const TESTING = /Google Chrome for Testing\.app/;

test("$SKD_CHROME wins when it is set", () => {
  assert.equal(
    fallbackChrome({ SKD_CHROME: "/opt/chrome" }, () => true),
    "/opt/chrome",
  );
});

test("without $SKD_CHROME, an installed Chrome for Testing is used", () => {
  assert.match(
    fallbackChrome({}, (path) => TESTING.test(path)),
    TESTING,
  );
});

test("with neither, there is no fallback and the channel's error stands", () => {
  assert.equal(
    fallbackChrome({}, () => false),
    undefined,
  );
});
