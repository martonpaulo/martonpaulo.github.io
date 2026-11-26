// The copy on a home page card stays readable over its gradient, WCAG 2.2 AA (#37).
//
// A card's 135deg gradient lightens toward the bottom-right corner, where the artwork sits; the copy
// sits top-left. A point (x, y) of a W by H card lies at (x + y) / (W + H) along a 135deg gradient,
// and the rendered home page put its farthest glyph at 0.62 of the way at 390, 1280 and 1920 px.
// So every colour the gradient paints up to TEXT_REACH must hold 4.5:1 against the muted ink, the
// lighter of the two inks the card uses.
// shortcut: TEXT_REACH is measured from the rendered page, not computed from the layout; measure
// again with a rendered check when the card's layout or type size changes.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { homeProjects } from "../src/lib/status.ts";

const TEXT_REACH = 0.7;
const AA_TEXT = 4.5;
// The muted inks of src/styles/tokens.scss: --tile-ink-light-muted (white at 92%) and --tile-ink-muted.
const MUTED = {
  light: { rgb: [255, 255, 255], alpha: 0.92 },
  dark: { rgb: [0x34, 0x41, 0x49], alpha: 1 },
};
const SAMPLES = 20;

const projects = JSON.parse(
  await readFile(new URL("../db/projects.json", import.meta.url), "utf8"),
);

const hex = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
const luminance = (rgb) => {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** The stops of a `linear-gradient(135deg, #rrggbb N%, ...)`, or null for any other background. */
function stops(gradient) {
  const match = gradient?.match(/^linear-gradient\(135deg,(.*)\)$/);
  if (!match) return null;
  return [...match[1].matchAll(/(#[0-9a-f]{6})\s+(\d+(?:\.\d+)?)%/gi)].map(([, colour, at]) => ({
    rgb: hex(colour),
    at: Number(at) / 100,
  }));
}

/** The colour the gradient paints at position t, between 0 and 1. */
function colourAt(list, t) {
  if (t <= list[0].at) return list[0].rgb;
  for (let i = 1; i < list.length; i++) {
    const [from, to] = [list[i - 1], list[i]];
    if (t <= to.at) {
      const f = (t - from.at) / (to.at - from.at || 1);
      return from.rgb.map((channel, k) => channel + (to.rgb[k] - channel) * f);
    }
  }
  return list.at(-1).rgb;
}

test("every home card's muted ink holds AA over the gradient wherever the copy sits", () => {
  const checked = homeProjects(projects).filter((project) => stops(project.gradient));
  assert.ok(checked.length > 0, "no home project has a 135deg gradient to check");
  for (const project of checked) {
    const list = stops(project.gradient);
    const ink = MUTED[project.ink ?? "dark"];
    for (let i = 0; i <= SAMPLES; i++) {
      const t = (TEXT_REACH * i) / SAMPLES;
      const ground = colourAt(list, t);
      const text = ink.rgb.map((channel, k) => channel * ink.alpha + ground[k] * (1 - ink.alpha));
      const measured = ratio(text, ground);
      assert.ok(
        measured >= AA_TEXT,
        `${project.slug}: muted ink is ${measured.toFixed(2)}:1 at ${t.toFixed(2)} of its gradient`,
      );
    }
  }
});
