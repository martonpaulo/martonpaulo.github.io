// Renders every control of the built site in every interaction state and fails when a state does
// not show, or shows unreadable (#45, #52).
//
//   node scripts/state-check.mjs dist [--out DIR]
//
// It reads every page, sorts each control (a link, a button, a form field) into one family of
// FAMILIES, and fails on a control no family takes, or on a current or selected control whose
// family has no current state. Then it renders one control of each look (each family, class and
// place) in each state: rest, hover, keyboard focus and pressed, and every current control on every
// page as current, current under the pointer, current with focus and current pressed. In each state,
// in the light and the dark colour-scheme emulation:
//
// - the label must reach its family's contrast against the pixels behind it (WCAG 2.2 AA: 4.5:1 for
//   text, 3:1 for an icon), measured on a render with the label hidden, so a gradient, a glow, a
//   press shade or a transparent fill counts as the visitor sees it;
// - hover must change the look; keyboard focus must draw the ring;
// - a current control keeps its fill, border and ink under hover, focus and press (the precedence of
//   src/styles/_states.scss), and looks unlike a hovered one.
//
// With --out, it also saves one PNG per family, look and state. It drives Chrome through
// playwright-core, headless, at desktop width; nothing reaches the screen.
/* global document, getComputedStyle, NodeFilter, requestAnimationFrame, SVGElement */
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import sharp from "sharp";

import { launchChrome, openBuilt } from "./lib/browser.mjs";
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
const SCHEMES = ["dark", "light"];
/** WCAG 2.2 AA: text 4.5:1, an icon or other non-text 3:1. */
const AA_TEXT = 4.5;
const AA_ICON = 3;
/** The ring is three hairlines wide (--focus-ring); a thinner one would not read. */
const MIN_RING_PX = 3;
/** What a control is, for the inventory: anything a visitor can point at, focus or press. */
const CONTROL = "a[href], button, summary, input, select, textarea, [role=button], [role=tab]";
/** A current or selected control, whatever attribute says so. */
const SELECTED = '[aria-current], [aria-selected="true"], [aria-pressed="true"]';
/**
 * Every control family, most specific first: a control belongs to the first that matches.
 * - label: the element whose ink is measured (default the control); "none" for an image link.
 * - min: the contrast the label needs; current: the family has a current state.
 * - focusable: false for a control the keyboard skips; hidden: shown only under keyboard focus.
 * - hover: false for a control a pointer cannot reach while it is hidden.
 */
const FAMILIES = [
  { name: "skip-link", selector: ".skip-link", hidden: true, hover: false },
  { name: "primary-button", selector: ".button--primary" },
  { name: "secondary-button", selector: ".button" },
  { name: "tab", selector: ".work-filters__chip", current: true },
  { name: "navigation-item", selector: ".nav__link", current: true },
  { name: "icon-button", selector: ".nav__home", label: "svg", min: AA_ICON, current: true },
  { name: "card", selector: ".project-card", label: ".project-card__title" },
  { name: "image-link", selector: ".project-row__icon-link", label: "none", focusable: false },
  { name: "text-link", selector: "a[href]" },
];
/** How much of a control's markup a failure quotes. */
const SNIPPET = 120;
/** The look a current control keeps in every combined state. */
const CURRENT_LOOK = ["color", "backgroundColor", "borderTopColor"];
/** What a state may change, compared between two states. */
const LOOK = [
  "color",
  "backgroundColor",
  "boxShadow",
  "transform",
  "textDecorationLine",
  "opacity",
];

async function pages(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && entry.name === "index.html") {
      const file = join(entry.parentPath ?? entry.path, entry.name);
      // A redirect page (/p/<slug>/) has no controls, and leaves before it can be read.
      if (/http-equiv="refresh"/i.test(await readFile(file, "utf8"))) continue;
      const path = relative(dist, entry.parentPath ?? entry.path)
        .split(sep)
        .join("/");
      found.push(path ? `/${path}/` : "/");
    }
  }
  return found.sort();
}

/** A box cut to the viewport, which is all a screenshot can show; undefined when none is left. */
function inViewport(box) {
  const x = Math.max(0, box.x);
  const y = Math.max(0, box.y);
  const width = Math.min(VIEWPORT.width, box.x + box.width) - x;
  const height = Math.min(VIEWPORT.height, box.y + box.height) - y;
  return width >= 1 && height >= 1 ? { x, y, width, height } : undefined;
}

/** The worst contrast of `ink` (r, g, b, alpha) over every pixel of a raw RGBA buffer. */
function worstContrast(ink, { data, info }) {
  let worst = Infinity;
  const [r, g, b, alpha] = ink;
  for (let i = 0; i < info.width * info.height * info.channels; i += info.channels) {
    const ground = [data[i], data[i + 1], data[i + 2]];
    const seen = [r, g, b].map((value, c) => value * alpha + ground[c] * (1 - alpha));
    worst = Math.min(worst, ratio(seen, ground));
  }
  return worst;
}

const { origin, close } = await serveDist(dist);
if (out) await mkdir(out, { recursive: true });

const failures = [];
const fail = (line) => failures.push(line);
/** A current control keeps its fill, border and ink in a combined state (#52). */
const keepsCurrent = (where, current, combined) => {
  for (const key of CURRENT_LOOK) {
    if (combined[key] !== current[key])
      fail(`${where}: ${key} ${current[key]} became ${combined[key]}`);
  }
};
const browser = await launchChrome();
let rendered = 0;
try {
  const page = await browser.newPage({ viewport: VIEWPORT, reducedMotion: "reduce" });
  await page.addInitScript(() => {
    // Hides a label's ink and keeps everything behind it, so the pixels left are its ground.
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = `[data-state-probe], [data-state-probe] * {
        color: transparent !important; -webkit-text-fill-color: transparent !important;
        text-decoration-color: transparent !important; text-shadow: none !important; }
        svg[data-state-probe], [data-state-probe] svg, [data-state-probe] img {
        visibility: hidden !important; }`;
      document.head.append(style);
    });
  });
  // Every state reads after its transition, which reduced motion makes all but instant: two
  // frames later it has ended.
  const settle = () =>
    page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
  const visit = async (path) => {
    await openBuilt(page, origin, path);
    // The page's arrival fades its content in; a label read mid-fade would measure faint.
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  };
  const lookOf = (target) =>
    target.evaluate((element, keys) => {
      const style = getComputedStyle(element);
      return Object.fromEntries(keys.map((key) => [key, style[key]]));
    }, LOOK.concat(CURRENT_LOOK));
  const ringOf = (target) =>
    target.evaluate((element) => {
      const style = getComputedStyle(element);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });

  /** The label's ink and the boxes its glyphs (or its icon) cover, in page pixels. */
  const labelOf = (target, family) =>
    target.evaluate(
      (element, label) => {
        const node = label ? element.querySelector(label) : element;
        if (!node) return undefined;
        const style = getComputedStyle(node);
        const parts = style.color.match(/[\d.]+/g).map(Number);
        let alpha = parts[3] ?? 1;
        for (let at = node; at && at !== document.documentElement; at = at.parentElement) {
          alpha *= Number(getComputedStyle(at).opacity);
        }
        const boxes = [];
        if (node instanceof SVGElement) {
          boxes.push(node.getBoundingClientRect());
        } else {
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
          for (let text = walker.nextNode(); text; text = walker.nextNode()) {
            // Text a screen reader alone reads (.visually-hidden) is clipped to a pixel: no ink.
            const box = text.parentElement.getBoundingClientRect();
            if (!text.textContent.trim() || box.width <= 1 || box.height <= 1) continue;
            const range = document.createRange();
            range.selectNodeContents(text);
            boxes.push(...range.getClientRects());
          }
        }
        return {
          ink: [parts[0], parts[1], parts[2], alpha],
          boxes: boxes
            .filter((box) => box.width >= 1 && box.height >= 1)
            .map((box) => ({ x: box.x, y: box.y, width: box.width, height: box.height })),
        };
      },
      family.label && family.label !== "none" ? family.label : null,
    );

  /** Measures the label against its ground in the state the page is in now. */
  const contrast = async (target, family, where) => {
    if (family.label === "none") return;
    const label = await labelOf(target, family);
    if (!label || label.boxes.length === 0) {
      fail(`${where}: no label to measure`);
      return;
    }
    const node = family.label ? target.locator(family.label).first() : target;
    await node.evaluate((element) => element.setAttribute("data-state-probe", ""));
    let worst = Infinity;
    try {
      for (const box of label.boxes.map(inViewport).filter(Boolean)) {
        const png = await page.screenshot({ clip: box, animations: "disabled" });
        const raw = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        worst = Math.min(worst, worstContrast(label.ink, raw));
      }
    } finally {
      await node.evaluate((element) => element.removeAttribute("data-state-probe"));
    }
    const least = family.min ?? AA_TEXT;
    if (worst < least) fail(`${where}: label contrast ${worst.toFixed(2)}:1, under ${least}:1`);
  };
  const shot = async (target, name) => {
    if (out) await target.screenshot({ path: join(out, `${name}.png`) });
  };
  const release = async () => {
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await page.evaluate(() => document.activeElement?.blur());
    await settle();
  };

  // 1. The inventory: every control of every page belongs to a family, and a current one to a
  //    family with a current state. One control of each look, and every current one, is rendered.
  const samples = new Map();
  for (const path of await pages(dist)) {
    await visit(path);
    const found = await page.evaluate(
      ({ control, selected, families, snippet }) =>
        [...document.querySelectorAll(control)].map((element, index) => {
          const family = families.find((candidate) => element.matches(candidate.selector));
          const parent = element.parentElement;
          return {
            index,
            family: family?.name,
            current: element.matches(selected),
            look: `${element.className}|${parent?.className}|${element.dataset.ink ?? ""}`,
            html: element.outerHTML.slice(0, snippet),
          };
        }),
      { control: CONTROL, selected: SELECTED, families: FAMILIES, snippet: SNIPPET },
    );
    for (const control of found) {
      const family = FAMILIES.find((candidate) => candidate.name === control.family);
      if (!family) {
        fail(`${path}: no family takes ${control.html}`);
        continue;
      }
      if (control.current && !family.current) {
        fail(`${path}: ${family.name} has no current state, yet ${control.html} is current`);
        continue;
      }
      const key = control.current
        ? `${family.name}|current|${path}`
        : `${family.name}|${control.look}`;
      if (!samples.has(key)) samples.set(key, { ...control, path, family });
    }
  }

  for (const family of FAMILIES.filter((candidate) => candidate.current)) {
    if (![...samples.values()].some((sample) => sample.family === family && sample.current)) {
      fail(`${family.name}: has a current state, yet no page shows a current one to check`);
    }
  }

  // 2. Every sample in every state, in both colour-scheme emulations.
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    for (const sample of samples.values()) {
      const { family, path } = sample;
      await visit(path);
      const target = page.locator(CONTROL).nth(sample.index);
      const name = `${family.name}${sample.current ? "-current" : ""}-${scheme}-${rendered}`;
      const where = (state) =>
        `${family.name}${sample.current ? " (current)" : ""} ${state}, ${scheme}, ${path}: ${sample.html.slice(0, 60)}`;
      rendered += 1;
      /** The look in the state the page is in now, after its label contrast is measured. */
      const state = async (label) => {
        await settle();
        const look = await lookOf(target);
        await contrast(target, family, where(label));
        await shot(target, `${name}-${label}`);
        return look;
      };
      if (!family.hidden) await target.scrollIntoViewIfNeeded();
      await release();

      // Rest, or current.
      const rest = await lookOf(target);
      if (!family.hidden) {
        await contrast(target, family, where(sample.current ? "current" : "rest"));
        await shot(target, `${name}-rest`);
      }

      // Hover.
      if (family.hover !== false) {
        await target.hover();
        const hover = await state("hover");
        if (sample.current) keepsCurrent(where("hover"), rest, hover);
        else if (JSON.stringify(rest) === JSON.stringify(hover)) {
          fail(`${where("hover")}: looks the same as rest`);
        }

        // Pressed, held, then released away from the control, so it never navigates.
        await page.mouse.down();
        const pressed = await state("pressed");
        if (sample.current) keepsCurrent(where("pressed"), rest, pressed);
        await release();
      }

      // Keyboard focus: a key press first, so the browser treats it as :focus-visible.
      if (family.focusable !== false) {
        await page.keyboard.press("Shift");
        await target.focus();
        const focus = await state("focus");
        const ring = await ringOf(target);
        if (ring.style === "none" || ring.width < MIN_RING_PX) {
          fail(`${where("focus")}: keyboard focus draws no ${MIN_RING_PX}px ring`);
        }
        if (sample.current) keepsCurrent(where("focus"), rest, focus);
        await release();
      }

      // A current control carries a fill of its own: unlike a sibling of its family at rest, and
      // unlike one under the pointer, so current never reads as hover or as nothing at all.
      if (sample.current) {
        const index = await page.evaluate(
          ({ control, selector }) =>
            [...document.querySelectorAll(control)].findIndex(
              (element) => element.matches(selector) && !element.hasAttribute("aria-current"),
            ),
          { control: CONTROL, selector: family.selector },
        );
        if (index >= 0) {
          const other = page.locator(CONTROL).nth(index);
          await other.scrollIntoViewIfNeeded();
          await release();
          const resting = await lookOf(other);
          await other.hover();
          await settle();
          const hovered = await lookOf(other);
          for (const [state, look] of [
            ["resting", resting],
            ["hovered", hovered],
          ]) {
            if (look.backgroundColor === rest.backgroundColor) {
              fail(`${where("current")}: its fill ${rest.backgroundColor} is a ${state} one's`);
            }
          }
          await release();
        }
      }
    }
  }
} finally {
  await browser.close();
  close();
}

if (failures.length > 0) {
  process.stderr.write(`${[...new Set(failures)].join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(
  `state-check: ${FAMILIES.length} families, ${rendered} renders in ${SCHEMES.length} schemes, pass\n`,
);
