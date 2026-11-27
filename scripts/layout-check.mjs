// Renders the built site in Chrome and fails when the layout moves between pages (#43):
//
// - the content's left edge differs between a short page and a long one, which happens when only
//   the long one shows a scrollbar and the page's width changes with it;
// - the tab row's or the list's top differs between the Projects tabs at 390, 768, 1024, 1280 or
//   1920 px, which happens when one tab's text above them wraps to more lines than another's (#54);
// - the underline of a hovered link reaches its external-link arrow (↗), which is never
//   underlined (#67): the arrow's box is drawn with the arrow's own ink hidden, once as it is and
//   once with every underline turned off, and the two must match;
// - a project row's platform-and-year column is not centred in the row at 1024 or 1280 px (#66);
// - a home card's picture does not start the same distance under its text as every other card's,
//   does not reach the card's bottom, or pushes its text past the padding, at 390, 1024, 1280 or
//   1920 px (#64).
//
//   node scripts/layout-check.mjs dist
//
// It drives Chrome through playwright-core (scripts/lib/browser.mjs picks the installed one), headless,
// in a fresh profile, against a local server of the build; nothing reaches the screen.
// The functions passed to evaluate() run in the page, where these are its globals.
/* global document, getComputedStyle, window, innerHeight */
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

import { launchChrome, openBuilt } from "./lib/browser.mjs";
import { serveDist } from "./lib/serve-dist.mjs";
import { subjectPath } from "../src/lib/subjects.ts";

const dist = process.argv[2];
if (!dist || !existsSync(join(dist, "index.html"))) {
  process.stderr.write("usage: node scripts/layout-check.mjs <built site, e.g. dist>\n");
  process.exit(2);
}

/** Desktop, tablet and phones: the widths the owner compared, and the narrowest one served. */
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "phone", width: 375, height: 812 },
  { name: "small phone", width: 320, height: 640 },
];
/** Phone widths at which no page may be wider than the window (#43). */
const PHONE_WIDTHS = [320, 375, 414];
const PHONE_HEIGHT = 812;
/** A short page and one far longer, both under the same layout. */
const SHORT_PAGE = subjectPath("learning");
const LONG_PAGE = "/projects/earlier/";
/** The widths at which every Projects tab must place its tab row and list alike (#54). */
const TAB_WIDTHS = [390, 768, 1024, 1280, 1920];
const TAB_HEIGHT = 900;
/** What must not move between tabs, by the name a failure gives it. */
const TAB_PARTS = { "tab row": ".work-filters", list: ".project-list" };
/** The owner's limit between two tabs (#54). */
const TOLERANCE_TABS = 1;
/** Layout positions are whole or half pixels; anything above this is a real move. */
const TOLERANCE = 0.5;

/** The pages with external links whose arrow must never be underlined (#67). */
const ARROW_PAGES = ["/", "/projects/"];
/** The arrow after an external link's name: a hidden glyph inside the link. */
const ARROW = 'a [aria-hidden="true"]';
/** Pixels below the arrow's box that an underline offset can reach. */
const UNDERLINE_REACH = 6;

/** The widths where a row's meta sits beside the name, centred in the row (#66). */
const ROW_WIDTHS = [1024, 1280];
/** A current list and the Earlier work list, whose rows are quieter but laid out alike. */
const ROW_PAGES = ["/projects/", LONG_PAGE];
/** One hairline, in CSS pixels: how far the meta's centre may sit from the row's. */
const HAIRLINE = 1;

/** The widths at which every home card places its picture by one rule (#64). */
const CARD_WIDTHS = [390, 1024, 1280, 1920];

/** Every page of the build, as the path a visitor requests; a redirect page is not a page. */
async function builtPages(root) {
  const entries = (await readdir(root, { recursive: true })).filter((e) => e.endsWith(".html"));
  const isRedirect = async (entry) =>
    (await readFile(join(root, entry), "utf8")).includes('http-equiv="refresh"');
  const redirects = new Set();
  for (const entry of entries) if (await isRedirect(entry)) redirects.add(entry);
  return entries
    .filter((entry) => !redirects.has(entry))
    .map((entry) => `/${relative(".", entry).replace(/index\.html$/, "")}`)
    .sort();
}

const { origin, close } = await serveDist(dist);

const failures = [];
// Headless Chrome hides scrollbars by default, which would hide the very jump this checks.
const browser = await launchChrome({
  ignoreDefaultArgs: ["--hide-scrollbars"],
});
try {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    const visit = (path) => openBuilt(page, origin, path);
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

    process.stdout.write(`${viewport.name}: content edge ${short}px\n`);
    await page.close();
  }

  // The tab row and the list under it start at the same place on every Projects tab, at every
  // width the owner compared (#54).
  for (const width of TAB_WIDTHS) {
    const page = await browser.newPage({
      viewport: { width, height: TAB_HEIGHT },
      reducedMotion: "reduce",
    });
    await page.goto(`${origin}/projects/`, { waitUntil: "load" });
    const tabs = await page
      .locator(".work-filters a")
      .evaluateAll((links) => links.map((link) => new URL(link.href).pathname));
    const places = [];
    for (const path of tabs) {
      await openBuilt(page, origin, path);
      const place = await page.evaluate((parts) => {
        const top = (selector) =>
          document.querySelector(selector).getBoundingClientRect().top + window.scrollY;
        return Object.fromEntries(Object.entries(parts).map(([name, at]) => [name, top(at)]));
      }, TAB_PARTS);
      places.push({ path, place });
    }
    const [first] = places;
    for (const { path, place } of places) {
      for (const name of Object.keys(TAB_PARTS)) {
        if (Math.abs(place[name] - first.place[name]) > TOLERANCE_TABS) {
          failures.push(
            `${width}px: the ${name} is at ${place[name]}px on ${path}, ${first.place[name]}px on ${first.path}`,
          );
        }
      }
    }
    process.stdout.write(
      `${width}px: ${tabs.length} tabs, tab row at ${first.place["tab row"]}px\n`,
    );
    await page.close();
  }

  // A row's tagline sits the same distance under its name in every row, however many platform
  // lines its meta has (#55).
  for (const width of TAB_WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: TAB_HEIGHT } });
    await openBuilt(page, origin, "/projects/");
    const gaps = await page.locator(".project-row").evaluateAll((rows) =>
      rows.map((row) => ({
        name: row.querySelector(".project-row__title a").textContent.trim(),
        gap:
          row.querySelector(".project-row__tagline").getBoundingClientRect().top -
          row.querySelector(".project-row__title").getBoundingClientRect().top,
      })),
    );
    for (const { name, gap } of gaps) {
      if (Math.abs(gap - gaps[0].gap) > TOLERANCE_TABS) {
        failures.push(
          `${width}px: ${name}'s tagline is ${gap}px under its name, not ${gaps[0].gap}px`,
        );
      }
    }
    await page.close();
  }

  // No page is wider than a phone's window: a wider one scrolls sideways when a link beyond the
  // edge takes focus, even where overflow-x: clip hides it from the pointer.
  const pages = await builtPages(dist);
  const page = await browser.newPage({
    viewport: { width: PHONE_WIDTHS[0], height: PHONE_HEIGHT },
  });
  for (const width of PHONE_WIDTHS) {
    await page.setViewportSize({ width, height: PHONE_HEIGHT });
    for (const path of pages) {
      await page.goto(`${origin}${path}`, { waitUntil: "load" });
      const [scroll, client] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      if (scroll > client)
        failures.push(`${width}px: ${path} is ${scroll}px wide, the window ${client}px`);
    }
  }
  process.stdout.write(`phones: ${pages.length} pages at ${PHONE_WIDTHS.join(", ")}px\n`);
  await page.close();

  // A row's meta column is centred against the whole row, whatever its number of lines (#66).
  const rowPage = await browser.newPage({ viewport: VIEWPORTS[0], reducedMotion: "reduce" });
  let rows = 0;
  for (const width of ROW_WIDTHS) {
    await rowPage.setViewportSize({ width, height: TAB_HEIGHT });
    for (const path of ROW_PAGES) {
      await openBuilt(rowPage, origin, path);
      const offCentre = await rowPage.evaluate((hairline) => {
        const wrong = [];
        for (const row of document.querySelectorAll(".project-row")) {
          const box = row.getBoundingClientRect();
          const style = getComputedStyle(row);
          const top = box.top + parseFloat(style.paddingTop);
          const bottom = box.bottom - parseFloat(style.paddingBottom);
          const meta = row.querySelector(".project-row__meta").getBoundingClientRect();
          const off = (meta.top + meta.bottom) / 2 - (top + bottom) / 2;
          if (Math.abs(off) > hairline) {
            const name = row.querySelector(".project-row__title").innerText.split("\n")[0];
            wrong.push(`${name} by ${off.toFixed(1)}px`);
          }
        }
        return [document.querySelectorAll(".project-row").length, wrong];
      }, HAIRLINE);
      rows += offCentre[0];
      for (const miss of offCentre[1])
        failures.push(`${width}px: ${path}: the meta of ${miss} is off the row's centre`);
    }
  }
  if (rows === 0) failures.push("no project row found");
  process.stdout.write(`rows: ${rows} at ${ROW_WIDTHS.join(", ")}px\n`);
  await rowPage.close();

  // Every home card's picture starts the same distance under its text and reaches the card's
  // bottom, whatever its neighbour's text; the art box takes a row's leftover height (#64, D4 A).
  const cardPage = await browser.newPage({ viewport: VIEWPORTS[0], reducedMotion: "reduce" });
  const fits = new Set();
  for (const width of CARD_WIDTHS) {
    await cardPage.setViewportSize({ width, height: TAB_HEIGHT });
    await openBuilt(cardPage, origin, "/");
    const cards = await cardPage.locator(".project-card__surface").evaluateAll((surfaces) =>
      surfaces.map((surface) => {
        const art = surface.querySelector(".project-card__art");
        const name = surface.querySelector(".project-card__title span").textContent.trim();
        if (!art) return { name, fit: "none" };
        const style = getComputedStyle(surface);
        const box = art.getBoundingClientRect();
        const info = surface.querySelector(".project-card__info").getBoundingClientRect();
        const margin = parseFloat(getComputedStyle(art).marginBottom);
        return {
          name,
          // The modifier class, project-card__art--<fit>, names the kind of art.
          fit: art.className.split("--").pop(),
          // The text stays inside the padding; a wider art box would push it past the card.
          over:
            info.right - (surface.getBoundingClientRect().right - parseFloat(style.paddingRight)),
          gap: box.top - info.bottom,
          // The art's box plus its own bottom margin ends where the surface's padding begins.
          short:
            surface.getBoundingClientRect().bottom -
            parseFloat(style.paddingBottom) -
            (box.bottom + margin),
        };
      }),
    );
    const placed = cards.filter((card) => card.fit !== "none");
    if (placed.length === 0) failures.push(`${width}px: no home card with a picture found`);
    for (const card of cards) fits.add(card.fit);
    for (const { name, over } of placed)
      if (over > HAIRLINE)
        failures.push(`${width}px: ${name}'s text runs ${over.toFixed(1)}px past its padding`);
    for (const { name, gap, short } of placed) {
      if (Math.abs(gap - placed[0].gap) > HAIRLINE)
        failures.push(
          `${width}px: ${name}'s picture starts ${gap.toFixed(1)}px under its text, ${placed[0].name}'s ${placed[0].gap.toFixed(1)}px`,
        );
      if (Math.abs(short) > HAIRLINE)
        failures.push(`${width}px: ${name}'s picture stops ${short.toFixed(1)}px above its bottom`);
    }
  }
  process.stdout.write(`cards: ${[...fits].join(", ")} at ${CARD_WIDTHS.join(", ")}px\n`);
  await cardPage.close();

  // An external link's arrow is never underlined, at rest or under the pointer (#67).
  const arrowPage = await browser.newPage({ viewport: VIEWPORTS[0], reducedMotion: "reduce" });
  let arrows = 0;
  for (const path of ARROW_PAGES) {
    await openBuilt(arrowPage, origin, path);
    const marks = arrowPage.locator(ARROW, { hasText: "↗" });
    for (let index = 0; index < (await marks.count()); index += 1) {
      const arrow = marks.nth(index);
      const link = arrow.locator("xpath=ancestor::a[1]");
      await arrow.scrollIntoViewIfNeeded();
      await link.hover();
      await arrow.evaluate((mark) => mark.style.setProperty("color", "transparent", "important"));
      const box = await arrow.boundingBox();
      const clip = { ...box, height: box.height + UNDERLINE_REACH };
      const shot = () => arrowPage.screenshot({ clip, animations: "disabled" });
      const hovered = await shot();
      await link.evaluate((anchor) => {
        for (const part of [anchor, ...anchor.querySelectorAll("*")])
          part.style.setProperty("text-decoration-line", "none", "important");
      });
      if (!hovered.equals(await shot()))
        failures.push(
          `${path}: the arrow of «${(await link.innerText()).trim().split("\n")[0]}» is underlined on hover`,
        );
      await arrowPage.reload({ waitUntil: "load" });
      arrows += 1;
    }
  }
  if (arrows === 0) failures.push(`no external-link arrow found on ${ARROW_PAGES.join(", ")}`);
  process.stdout.write(`arrows: ${arrows} on ${ARROW_PAGES.join(", ")}\n`);
  await arrowPage.close();
} finally {
  await browser.close();
  close();
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write("layout-check: pass\n");
