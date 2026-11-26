// One way to start headless Chrome for the scripts that render the built site
// (scripts/layout-check.mjs, scripts/state-check.mjs). It prefers the installed Google Chrome
// (playwright-core's `chrome` channel), then the browser $SKD_CHROME names (Workbench's variable
// for a machine whose only Chrome is Chrome for Testing), so such a machine runs the same checks.
import { chromium } from "playwright-core";

/** Launches Chrome headless with `options`; throws the channel's error when no Chrome is found. */
export async function launchChrome(options = {}) {
  try {
    return await chromium.launch({ channel: "chrome", headless: true, ...options });
  } catch (error) {
    if (!process.env.SKD_CHROME) throw error;
    return chromium.launch({ executablePath: process.env.SKD_CHROME, headless: true, ...options });
  }
}
