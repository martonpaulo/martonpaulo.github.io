// One way to start headless Chrome for the scripts that render the built site
// (scripts/layout-check.mjs, scripts/state-check.mjs). It prefers the installed Google Chrome
// (playwright-core's `chrome` channel), then the browser $SKD_CHROME names (Workbench's variable),
// then Chrome for Testing in /Applications, so a Mac whose only Chrome is Chrome for Testing runs
// the same checks without the variable.
import { existsSync } from "node:fs";

import { chromium } from "playwright-core";

const TESTING_APP = "/Applications/Google Chrome for Testing.app";
const TESTING_BINARY = "Contents/MacOS/Google Chrome for Testing";
const CHROME_FOR_TESTING = `${TESTING_APP}/${TESTING_BINARY}`;

/** The browser to start when the `chrome` channel has none: $SKD_CHROME, else Chrome for Testing. */
export function fallbackChrome(env = process.env, exists = existsSync) {
  if (env.SKD_CHROME) return env.SKD_CHROME;
  return exists(CHROME_FOR_TESTING) ? CHROME_FOR_TESTING : undefined;
}

/** Launches Chrome headless with `options`; throws the channel's error when no Chrome is found. */
export async function launchChrome(options = {}) {
  try {
    return await chromium.launch({ channel: "chrome", headless: true, ...options });
  } catch (error) {
    const executablePath = fallbackChrome();
    if (!executablePath) throw error;
    return chromium.launch({ executablePath, headless: true, ...options });
  }
}

/** Opens `path` of the build served at `origin` in `page`; throws when it does not answer 200. */
export async function openBuilt(page, origin, path) {
  const response = await page.goto(`${origin}${path}`, { waitUntil: "load" });
  if (!response?.ok()) throw new Error(`${path} answered ${response?.status()}`);
}
