// Renders every control family of the built site in each of its states and fails when a state
// does not show (#45): hover must change the control's look, keyboard focus must draw the focus
// ring, and the current page or tab must look unlike a hovered one.
//
//   node scripts/state-check.mjs dist [--out DIR]
//
// With --out, it also saves one PNG per family and state, the renders the spec in
// docs/design-system.md, "Interaction states", is judged against. It drives the installed Google
// Chrome through playwright-core, headless, at desktop width; nothing reaches the screen.
/* global document, getComputedStyle, requestAnimationFrame */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { ratio } from "./lib/contrast.mjs";
import { serveDist } from "./lib/serve-dist.mjs";

const dist = process.argv[2];
const outIndex = process.argv.indexOf("--out");
const out = outIndex > 0 ? process.argv[outIndex + 1] : undefined;
if (!dist || !existsSync(join(dist, "index.html"))) {
  process.stderr.write("usage: node scripts/state-check.mjs <built site, e.g. dist> [--out DIR]\n");
  process.exit(2);
}

const VIEWPORT = { width: 1440, height: 900 };
/** WCAG 2.2 AA for text. */
const AA_TEXT = 4.5;
/** Red, green and blue: the first three numbers of a computed colour. */
const RGB_PARTS = 3;
/** "rgb(1, 2, 3)" or "rgba(1, 2, 3, 1)" as [1, 2, 3]. */
const rgb = (css) =>
  css
    .match(/\d+(\.\d+)?/g)
    .slice(0, RGB_PARTS)
    .map(Number);
/** The ring is three hairlines wide (--focus-ring); a thinner one would not read. */
const MIN_RING_PX = 3;
/** One example of each family, on the page where it lives. */
const FAMILIES = [
  { name: "primary-button", page: "/", selector: ".button--primary" },
  { name: "secondary-button", page: "/", selector: ".button:not(.button--primary)" },
  { name: "tab", page: "/projects/", selector: ".work-filters__chip:not([aria-current])" },
  { name: "navigation-item", page: "/projects/", selector: ".nav__link:not([aria-current])" },
  { name: "icon-button", page: "/projects/", selector: ".nav__home" },
  { name: "text-link", page: "/projects/", selector: ".project-row__title a" },
  // A quiet link comes up to the body text on hover, never to the accent (#45).
  {
    name: "quiet-link",
    page: "/projects/",
    selector: ".project-row__meta a",
    hoverColor: "var(--state-hover-text)",
  },
  { name: "card", page: "/", selector: ".project-card" },
  // An image link shows its state on the image inside it, and is skipped by the keyboard.
  {
    name: "image-link",
    page: "/projects/",
    selector: ".project-row__icon-link",
    shows: "img",
    focusable: false,
  },
];
const CURRENT = [
  { name: "tab", page: "/projects/", selector: ".work-filters__chip[aria-current]" },
  { name: "navigation-item", page: "/projects/", selector: ".nav__link[aria-current]" },
];
const LOOK = [
  "color",
  "backgroundColor",
  "boxShadow",
  "transform",
  "textDecorationLine",
  "opacity",
];

const { origin, close } = await serveDist(dist);
if (out) await mkdir(out, { recursive: true });

const failures = [];
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: VIEWPORT, reducedMotion: "reduce" });
  // Every state reads after its transition, which reduced motion makes all but instant: two
  // frames later it has ended.
  const settle = () =>
    page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
  const look = (target) =>
    target.evaluate((element, keys) => {
      const style = getComputedStyle(element);
      return Object.fromEntries(keys.map((key) => [key, style[key]]));
    }, LOOK);
  const lookOf = (target, family) =>
    look(family.shows ? target.locator(family.shows).first() : target);
  const shot = async (target, family, state) => {
    if (out) await target.screenshot({ path: join(out, `${family}-${state}-dark-default.png`) });
  };
  const visit = async (path) => {
    const response = await page.goto(`${origin}${path}`, { waitUntil: "load" });
    if (!response?.ok()) throw new Error(`${path} answered ${response?.status()}`);
  };

  for (const family of FAMILIES) {
    await visit(family.page);
    const target = page.locator(family.selector).first();
    await target.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await settle();
    const rest = await lookOf(target, family);
    await shot(target, family.name, "rest");

    await target.hover();
    await settle();
    const hover = await lookOf(target, family);
    await shot(target, family.name, "hover");
    if (family.hoverColor) {
      const expected = await page.evaluate((value) => {
        const probe = document.body.appendChild(document.createElement("span"));
        probe.style.color = value;
        const colour = getComputedStyle(probe).color;
        probe.remove();
        return colour;
      }, family.hoverColor);
      if (hover.color !== expected) {
        failures.push(`${family.name}: hover is ${hover.color}, not ${family.hoverColor}`);
      }
    }
    if (JSON.stringify(rest) === JSON.stringify(hover)) {
      failures.push(`${family.name}: hover looks the same as rest (${JSON.stringify(rest)})`);
    }

    // Released away from the control, so the press never becomes a click that navigates.
    await page.mouse.down();
    await shot(target, family.name, "pressed");
    await page.mouse.move(0, 0);
    await page.mouse.up();

    if (family.focusable !== false) {
      // A key press first, so the browser treats the focus as keyboard focus (:focus-visible).
      await page.keyboard.press("Shift");
      await target.focus();
      const ring = await target.evaluate((element) => {
        const style = getComputedStyle(element);
        return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
      });
      await shot(target, family.name, "focus");
      if (ring.style === "none" || ring.width < MIN_RING_PX) {
        failures.push(`${family.name}: keyboard focus draws no ${MIN_RING_PX}px ring`);
      }
    }
  }

  for (const family of CURRENT) {
    await visit(family.page);
    const current = page.locator(family.selector).first();
    await page.mouse.move(0, 0);
    await settle();
    const currentLook = await look(current);
    await shot(current, family.name, "current");
    const other = page.locator(family.selector.replace("[aria-current]", ":not([aria-current])"));
    await other.first().hover();
    await settle();
    const hover = await look(other.first());
    if (JSON.stringify(currentLook) === JSON.stringify(hover)) {
      failures.push(`${family.name}: the current one looks like a hovered one`);
    }
    // Pointing at the current one keeps it current, and readable.
    await current.hover();
    await settle();
    const currentHover = await look(current);
    await shot(current, family.name, "current-hover");
    if (JSON.stringify(currentHover) !== JSON.stringify(currentLook)) {
      failures.push(`${family.name}: the current one changes on hover`);
    }
    const contrast = ratio(rgb(currentHover.color), rgb(currentHover.backgroundColor));
    if (contrast < AA_TEXT) {
      failures.push(`${family.name}: the hovered current one is ${contrast.toFixed(2)}:1`);
    }
  }
} finally {
  await browser.close();
  close();
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`state-check: ${FAMILIES.length} families, pass\n`);
