// Renders the built site in Chrome and fails when the layout moves between pages (#43):
//
// - the content's left edge differs between a short page and a long one, which happens when only
//   the long one shows a scrollbar and the page's width changes with it;
// - the tab row's top differs between the Projects tabs, which happens when one tab's title or
//   lede wraps to more lines than another's.
//
//   node scripts/layout-check.mjs dist
//
// It drives the installed Google Chrome through playwright-core (the `chrome` channel), headless,
// in a fresh profile, against a local server of the build; nothing reaches the screen.
// The functions passed to evaluate() run in the page, where these are its globals.
/* global document, window, innerHeight */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

import { chromium } from "playwright-core";

const dist = process.argv[2];
if (!dist || !existsSync(join(dist, "index.html"))) {
  process.stderr.write("usage: node scripts/layout-check.mjs <built site, e.g. dist>\n");
  process.exit(2);
}

/** Desktop and phone, the widths the owner compared. */
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 375, height: 812 },
];
/** A short page and one far longer, both under the same layout. */
const SHORT_PAGE = "/projects/kind/typeface/";
const LONG_PAGE = "/projects/earlier/";
/** Layout positions are whole or half pixels; anything above this is a real move. */
const TOLERANCE = 0.5;
const HOST = "127.0.0.1";
const LOCAL = `http://${HOST}`;
const HTTP = { ok: 200, notFound: 404 };
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };

const server = createServer((request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, LOCAL).pathname));
  let file = join(dist, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    response.writeHead(HTTP.notFound).end();
    return;
  }
  response.writeHead(HTTP.ok, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
  });
  createReadStream(file).pipe(response);
});
await new Promise((resolve) => server.listen(0, HOST, resolve));
const origin = `${LOCAL}:${server.address().port}`;

const failures = [];
// Headless Chrome hides scrollbars by default, which would hide the very jump this checks.
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  ignoreDefaultArgs: ["--hide-scrollbars"],
});
try {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    const visit = async (path) => {
      const response = await page.goto(`${origin}${path}`, { waitUntil: "load" });
      if (!response?.ok()) throw new Error(`${path} answered ${response?.status()}`);
    };
    const left = async (path) => {
      await visit(path);
      return page.locator("main").evaluate((main) => main.getBoundingClientRect().left);
    };

    // A window just taller than the short page, so it needs no scrollbar while the long one does.
    await visit(SHORT_PAGE);
    const fits = await page.evaluate(() => document.documentElement.scrollHeight + 100);
    await page.setViewportSize({ width: viewport.width, height: fits });
    const short = await left(SHORT_PAGE);
    const long = await left(LONG_PAGE);
    const tall = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight);
    if (!tall)
      failures.push(`${viewport.name}: ${LONG_PAGE} fits the window, so it proves nothing`);
    await page.setViewportSize(viewport);
    if (Math.abs(short - long) > TOLERANCE) {
      failures.push(
        `${viewport.name}: content starts at ${short}px on ${SHORT_PAGE}, ${long}px on ${LONG_PAGE}`,
      );
    }

    await visit("/projects/");
    const tabs = await page
      .locator(".work-filters a")
      .evaluateAll((links) => links.map((link) => new URL(link.href).pathname));
    const tops = [];
    for (const path of tabs) {
      await visit(path);
      const top = await page
        .locator(".work-filters")
        .evaluate((row) => row.getBoundingClientRect().top + window.scrollY);
      tops.push({ path, top });
    }
    const [first] = tops;
    for (const { path, top } of tops) {
      if (Math.abs(top - first.top) > TOLERANCE) {
        failures.push(
          `${viewport.name}: the tab row is at ${top}px on ${path}, ${first.top}px on ${first.path}`,
        );
      }
    }
    process.stdout.write(`${viewport.name}: ${tabs.length} tabs, content edge ${short}px\n`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write("layout-check: pass\n");
