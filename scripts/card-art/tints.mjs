// A tile is painted with a colour taken from the product's own social card, so
// the two read as one product. A flat average turns a graphite card into an
// invented hue, so the card is quantised and each colour scored by saturation
// times area: that finds the gradient on a colourful card and the accent on a
// near-neutral one. The winner is then softened to the band the tiles live in.
//
// Run `npm run card-tints` after a card changes; it rewrites db/projects.json.
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";

const run = promisify(execFile);

const TINT_LIGHTNESS = 0.84;
const TINT_SATURATION = { min: 0.3, max: 0.44 };

const hslToHex = (h, l, s) => {
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const toHsl = (hex) => {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g
        ? ((b - r) / d + 2) / 6
        : ((r - g) / d + 4) / 6;
  return { h, s, l };
};

const projectsPath = path.join(process.cwd(), "db", "projects.json");
const projects = JSON.parse(await readFile(projectsPath, "utf8"));

for (const project of projects) {
  const card = path.join(process.cwd(), "src", "assets", "cards", `${project.slug}.jpg`);
  let histogram;
  try {
    ({ stdout: histogram } = await run("magick", [
      card,
      "-resize",
      "200x",
      "-colors",
      "10",
      "-depth",
      "8",
      "-format",
      "%c",
      "histogram:info:",
    ]));
  } catch {
    process.stdout.write(`${project.slug}: no card, left as it is\n`);
    continue;
  }

  let best = null;
  for (const [, count, hex] of histogram.matchAll(/\s*(\d+):\s*\([^)]*\)\s*#([0-9A-F]{6})/g)) {
    const { h, s, l } = toHsl(hex);
    if (l < 0.06 || l > 0.94) continue; // pure black and white carry no hue
    const score = s * Math.sqrt(Number(count));
    if (!best || score > best.score) best = { score, h, s };
  }
  if (!best) continue;

  const s = Math.min(Math.max(best.s, TINT_SATURATION.min), TINT_SATURATION.max);
  project.tint = hslToHex(best.h, TINT_LIGHTNESS, s);
  process.stdout.write(`${project.slug}: ${project.tint}\n`);
}

await writeFile(projectsPath, `${JSON.stringify(projects, null, 2)}\n`);
