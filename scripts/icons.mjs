// Draws the icon of every Earlier work entry that has none yet (#43): its own favicon from the
// archived folder on a light tile, or, when the folder has no usable one, its initial on a tile in
// the style of the products' own icons. The result is src/assets/share/<slug>.png, 208 px, the
// file the project list shows beside each row; tests/earlier.test.mjs fails on an entry without one.
//
//   node scripts/icons.mjs <archive/site> [--glyph <slug>=<png>:<#rrggbb>]...
//
// `--glyph` draws one product's own glyph on its own colour, for a product whose icon exists only
// as a layered source (Leve's Icon Composer bundle). An icon file that exists is never redrawn;
// delete it first to draw it again.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

import { woffToSfnt } from "../src/lib/fonts.ts";

const SIZE = 208;
/** The corner of the products' own tiles at 208 px, measured on src/assets/share/mailbell.png. */
const RADIUS = 46;
/** The share of the tile a favicon covers, so a square logo keeps the products' margin. */
const LOGO_SHARE = 0.6;
/** Below this, a bitmap favicon is a blur when drawn at tile size; the initial reads better. */
const MIN_BITMAP = 32;
const TILE_LIGHT = "#f4f4f5";
/** How finely an SVG favicon is rasterised before it is scaled to the tile, in dots per inch. */
const SVG_DENSITY = 600;
const SVG_NS = "http://www.w3.org/2000/svg";
/** A string hash's multiplier and seed, so a slug always picks the same gradient. */
const HASH = { base: 31, seed: 7 };
const RGBA = 4;
/**
 * The ICO layout (https://learn.microsoft.com/en-us/previous-versions/ms997538(v=msdn.10)): a
 * 6-byte header whose count is at 4, then a 16-byte entry per image (width at 0, 0 meaning 256;
 * size at 8; offset at 12). A bitmap image is a 40-byte info header (width at 4, twice the
 * height at 8, bits per pixel at 14), then BGRA rows from the bottom up.
 */
const ICO = {
  type: 2,
  count: 4,
  header: 6,
  entry: 16,
  fullWidth: 256,
  size: 8,
  offset: 12,
  info: 40,
  width: 4,
  height: 8,
  bits: 14,
  bgraBits: 32,
};
/** The bytes 1 to 3 of every PNG file spell its name. */
const PNG_NAME = { from: 1, to: 4 };
// Two-stop gradients in the hues the products' own icons use, picked by the slug so a tile keeps
// its colour from run to run.
const GRADIENTS = [
  ["#7fd3c4", "#2f7fb5"],
  ["#f6c454", "#e39b1b"],
  ["#b39cf0", "#6d55c9"],
  ["#f49a8a", "#d4526a"],
  ["#8fd18b", "#3b9a64"],
  ["#8ec5f5", "#3d6fd1"],
];

const root = new URL("..", import.meta.url).pathname;
const out = (slug) => join(root, "src/assets/share", `${slug}.png`);
const say = (line) => process.stdout.write(`${line}\n`);

const args = process.argv.slice(2);
const site = args.find((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--glyph");
if (!site || !existsSync(site)) {
  process.stderr.write("usage: node scripts/icons.mjs <archive/site> [--glyph ...]\n");
  process.exit(2);
}
const glyphs = args.flatMap((arg, index) => (args[index - 1] === "--glyph" ? [arg] : []));

const tileSvg = (fill, body = "") =>
  `<svg xmlns="${SVG_NS}" width="${SIZE}" height="${SIZE}">${fill}` +
  `<rect width="${SIZE}" height="${SIZE}" rx="${RADIUS}" fill="url(#g)"/>${body}</svg>`;

const gradient = ([from, to]) =>
  `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>`;

const roundMask = Buffer.from(tileSvg(gradient(["#000", "#000"])));

const isPng = (data) => data.subarray(PNG_NAME.from, PNG_NAME.to).toString("latin1") === "PNG";

/** An ICO's largest image as a PNG, or null when it is a bitmap this script cannot read. */
function icoToPng(data) {
  if (data.readUInt16LE(ICO.type) !== 1) return null;
  const entries = Array.from({ length: data.readUInt16LE(ICO.count) }, (_, index) => {
    const at = ICO.header + index * ICO.entry;
    return {
      width: data[at] || ICO.fullWidth,
      size: data.readUInt32LE(at + ICO.size),
      offset: data.readUInt32LE(at + ICO.offset),
    };
  }).sort((a, b) => b.width - a.width);
  const best = entries[0];
  if (!best) return null;
  const image = data.subarray(best.offset, best.offset + best.size);
  if (isPng(image)) return { png: image, width: best.width };
  const width = image.readInt32LE(ICO.width);
  const height = image.readInt32LE(ICO.height) / 2;
  if (image.readUInt16LE(ICO.bits) !== ICO.bgraBits) return null;
  const pixels = Buffer.alloc(width * height * RGBA);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const from = ICO.info + ((height - 1 - y) * width + x) * RGBA;
      const [blue, green, red, alpha] = image.subarray(from, from + RGBA);
      pixels.set([red, green, blue, alpha], (y * width + x) * RGBA);
    }
  }
  return { raw: { pixels, width, height }, width };
}

/** The folder's favicon as an image sharp reads, or null when it has none worth drawing. */
async function favicon(folder) {
  const html = await readFile(join(folder, "index.html"), "utf8").catch(() => "");
  const linked = [...html.matchAll(/<link[^>]*rel="[^"]*icon[^"]*"[^>]*>/gi)]
    .map(([tag]) => /href="([^"]+)"/.exec(tag)?.[1])
    .filter(Boolean)
    // An absolute href names the archive's own folder: /<slug>/assets/logo.svg.
    .map((href) => href.replace(/^\/[^/]+\//, "").replace(/^\.\//, ""));
  for (const name of [...linked, "favicon.svg", "favicon.png", "favicon.ico", "icon.ico"]) {
    const path = join(folder, name);
    if (!existsSync(path)) continue;
    const data = await readFile(path);
    if (name.endsWith(".svg")) return sharp(data, { density: SVG_DENSITY });
    if (isPng(data)) {
      const { width } = await sharp(data).metadata();
      if (width >= MIN_BITMAP) return sharp(data);
      continue;
    }
    const ico = icoToPng(data);
    if (!ico || ico.width < MIN_BITMAP) continue;
    return ico.png
      ? sharp(ico.png)
      : sharp(ico.raw.pixels, {
          raw: { width: ico.raw.width, height: ico.raw.height, channels: RGBA },
        });
  }
  return null;
}

async function logoTile(logo) {
  const side = Math.round(SIZE * LOGO_SHARE);
  const mark = await logo
    .resize(side, side, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp(Buffer.from(tileSvg(gradient([TILE_LIGHT, TILE_LIGHT]))))
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();
}

const font = woffToSfnt(
  await readFile(
    join(root, "node_modules/@fontsource/gabarito/files/gabarito-latin-700-normal.woff"),
  ),
);

function initialTile(slug, name) {
  const hash = [...slug].reduce(
    (sum, char) => (sum * HASH.base + char.charCodeAt(0)) >>> 0,
    HASH.seed,
  );
  const letter = name.trim().charAt(0).toUpperCase();
  const svg = tileSvg(
    gradient(GRADIENTS[hash % GRADIENTS.length]),
    `<text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="Gabarito" ` +
      `font-weight="700" font-size="112" fill="#ffffff">${letter}</text>`,
  );
  const resvg = new Resvg(svg, {
    font: { fontBuffers: [font], loadSystemFonts: false, defaultFontFamily: "Gabarito" },
  });
  return resvg.render().asPng();
}

async function glyphTile(path, colour) {
  const side = Math.round(SIZE * LOGO_SHARE);
  // A layer image carries the canvas around its glyph; trim it so the glyph fills the tile.
  const mark = await sharp(await readFile(path))
    .trim()
    .resize(side, side, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const tile = Buffer.from(tileSvg(gradient([colour, colour])));
  return sharp(tile)
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();
}

const write = async (slug, png, how) => {
  // Cut every tile to the same rounded square, whatever the source drew outside it.
  await sharp(png)
    .composite([{ input: roundMask, blend: "dest-in" }])
    .png()
    .toFile(out(slug));
  say(`${slug}: ${how}`);
};

for (const spec of glyphs) {
  const [, slug, path, colour] = /^([a-z0-9-]+)=(.+):(#[0-9a-f]{6})$/i.exec(spec) ?? [];
  if (!slug) throw new Error(`--glyph ${spec}: expected <slug>=<png>:<#rrggbb>`);
  if (!existsSync(out(slug))) await write(slug, await glyphTile(path, colour), "own glyph");
}

const earlier = JSON.parse(await readFile(join(root, "db/earlier.json"), "utf8"));
for (const entry of earlier.filter((e) => !e.project && !existsSync(out(e.slug)))) {
  const logo = await favicon(join(site, entry.slug));
  if (logo) await write(entry.slug, await logoTile(logo), "favicon");
  else await write(entry.slug, initialTile(entry.slug, entry.name), "initial");
}
