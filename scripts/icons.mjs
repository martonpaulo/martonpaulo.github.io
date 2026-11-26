// Draws the icon of every Earlier work entry that has none yet (#43, #49): its own favicon from the
// archived folder filling its square, or, when the folder has no usable one, its initial on a tile in
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
import { luminance } from "./lib/contrast.mjs";

const SIZE = 208;
/** The corner of the products' own tiles at 208 px, measured on src/assets/share/mailbell.png. */
const RADIUS = 46;
/** The share of the tile a glyph covers on its own colour (--glyph). */
const LOGO_SHARE = 0.6;
/**
 * A favicon on a transparent ground fills this share of the tile, on a ground of its own colour
 * (#49): the margin its own shape needs, never a small badge on a grey tile.
 */
const MARK_SHARE = 0.72;
/** A favicon whose trimmed edges are this opaque is already a tile: it becomes the whole icon. */
const TILE_EDGE_OPAQUE = 0.85;
const OPAQUE = 200;
/** How far the ground is pushed from the mark's own colour so the mark reads on it, 0 to 1. */
const GROUND_SHIFT = 0.82;
/** Relative luminance above which a mark is light, so its ground goes dark (WCAG's midpoint). */
const LIGHT_MARK = 0.4;
const CHANNEL_MAX = 255;
/** Where the alpha of an RGBA pixel is. */
const ALPHA = 3;
/** The middle half of an edge, as shares of its length. */
const EDGE_MIDDLE = { from: 0.25, to: 0.75 };
/** Colours count as one when they agree above these low bits (steps of 32). */
const SHADE_BITS = 5;
/** Below this, a bitmap favicon is a blur when it fills the tile; the initial reads better (#49). */
const MIN_BITMAP = 64;
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

const HEX_BASE = 16;
const HEX_DIGITS = 2;
const toHex = (rgb) =>
  `#${rgb.map((v) => Math.round(v).toString(HEX_BASE).padStart(HEX_DIGITS, "0")).join("")}`;

/** The trimmed favicon's pixels, whether it is already a tile, and its dominant opaque colour. */
async function readLogo(logo) {
  const trimmed = await logo
    .png()
    .toBuffer()
    .then((png) => sharp(png).trim().toBuffer());
  const { data, info } = await sharp(trimmed)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const at = (x, y) => data[(y * info.width + x) * RGBA + ALPHA];
  // The middle half of each edge: a rounded tile leaves its corners clear, never its sides.
  const middle = (length) => {
    const from = Math.floor(length * EDGE_MIDDLE.from);
    return Array.from({ length: Math.ceil(length * EDGE_MIDDLE.to) - from }, (_, i) => from + i);
  };
  const edge = [
    ...middle(info.width).flatMap((x) => [at(x, 0), at(x, info.height - 1)]),
    ...middle(info.height).flatMap((y) => [at(0, y), at(info.width - 1, y)]),
  ];
  const tile = edge.filter((alpha) => alpha >= OPAQUE).length / edge.length >= TILE_EDGE_OPAQUE;
  // The most frequent colour among opaque pixels, in steps of 32 so near shades count once.
  const counts = new Map();
  for (let i = 0; i < data.length; i += RGBA) {
    if (data[i + ALPHA] < OPAQUE) continue;
    const rgb = Array.from(data.subarray(i, i + ALPHA));
    const key = rgb.map((value) => value >> SHADE_BITS).join(",");
    const entry = counts.get(key) ?? { n: 0, sum: [0, 0, 0] };
    entry.n += 1;
    rgb.forEach((value, c) => (entry.sum[c] += value));
    counts.set(key, entry);
  }
  const top = [...counts.values()].sort((a, b) => b.n - a.n)[0];
  const colour = top ? top.sum.map((v) => v / top.n) : [0, 0, 0];
  return { png: trimmed, tile, colour };
}

/**
 * A favicon as the whole icon (#49). One that is already a tile fills the square edge to edge; a
 * mark on a transparent ground fills most of it, on a ground of its own colour pushed toward dark
 * (for a light mark) or light (for a dark one), so the mark reads and the icon is one colour family.
 */
async function logoTile(logo) {
  const { png, tile, colour } = await readLogo(logo);
  if (tile) return sharp(png).resize(SIZE, SIZE, { fit: "cover" }).png().toBuffer();
  const target = luminance(colour) > LIGHT_MARK ? 0 : CHANNEL_MAX;
  const ground = colour.map((v) => v + (target - v) * GROUND_SHIFT);
  const side = Math.round(SIZE * MARK_SHARE);
  const mark = await sharp(png)
    .resize(side, side, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp(Buffer.from(tileSvg(gradient([toHex(ground), toHex(ground)]))))
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
