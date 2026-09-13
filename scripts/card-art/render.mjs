// The home tiles show each product's own drawing, taken from the drawing the
// product's social card already carries: the card HTML is rendered with its
// copy hidden and its gradient removed, so what is written here is the element
// alone on transparency. The tile paints its colour behind it.
//
// The card sources live in the product repositories, which are checked out
// beside this one. Run `pnpm card-art` after a product's card changes;
// nothing in the build depends on it.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const SIBLINGS = path.resolve(process.cwd(), "..");
const OUT = path.join(process.cwd(), "src", "assets", "projects");
const CARD = "design/social-card/social-card.html";

// slug -> the repository that owns its card. A slug missing here keeps whatever
// artwork it has; not every project draws a card.
const REPOS = {
  tabelo: "tabelo",
  meantime: "meantime",
  windowhop: "windowhop",
  orbit: "orbit",
  "moon-uniform": "moon-uniform",
  lights: "lights",
};

// Hiding the copy is not enough: the gradient and the glow are painted by the
// card itself and by its ::before, and both would come out as a rectangle.
const STRIP = `
  html, body { background: transparent !important; }
  .card { background: none !important; }
  .card::before, .card::after { display: none !important; }
  .copy { display: none !important; }
`;

// Lights is one field of light, not a drawing on a ground, so its tile is that
// field edge to edge (fit "full"): the card's own dark and its own drifting
// lights, rendered with the copy hidden but the background kept, so the tile
// and the picture are the same pixels and no seam can show. The frame is made
// square, close to a tile's shape, and the field covers it; its mask clears
// the top-left corner, where the tile's copy sits, instead of the card's left.
const LIGHTS_FIELD = `
  html, body { background: #05080d !important; }
  .card { width: 1200px !important; height: 1200px !important; }
  .copy { display: none !important; }
  .field {
    left: 0 !important; top: 0 !important;
    width: 1200px !important; height: 1200px !important;
    -webkit-mask-image: linear-gradient(160deg, transparent 0, transparent 30%, #000 62%) !important;
    mask-image: linear-gradient(160deg, transparent 0, transparent 30%, #000 62%) !important;
  }
`;

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

for (const [slug, repo] of Object.entries(REPOS)) {
  const html = path.join(SIBLINGS, repo, CARD);
  const full = slug === "lights";
  const page = await browser.newPage({
    viewport: { width: 1200, height: full ? 1200 : 630 },
    deviceScaleFactor: 2,
  });
  try {
    await page.goto(`file://${html}`);
  } catch {
    console.warn(`${slug}: no card at ${html}, skipped`);
    await page.close();
    continue;
  }
  await page.addStyleTag({ content: full ? LIGHTS_FIELD : STRIP });
  // The cards animate nothing, but web fonts and the Lights canvas settle late.
  await page.waitForTimeout(600);
  const shot = await page.screenshot({ omitBackground: !full });
  await page.close();

  if (full) {
    // Opaque and whole: nothing to trim, and the tile crops it with object-fit.
    await writeFile(path.join(OUT, `${slug}.png`), shot);
    process.stdout.write(`${slug}.png written\n`);
    continue;
  }

  const raw = path.join(OUT, `${slug}.raw.png`);
  await writeFile(raw, shot);
  // -trim drops the transparent margin the 1200x630 frame leaves around it.
  const out = path.join(OUT, `${slug}.png`);
  await run("magick", [raw, "-trim", "+repage", out]);
  await run("rm", [raw]);
  // The tile crops from the right and the bottom, so the drawing has to end
  // there. -trim keeps the panel's soft shadow, which on those two sides reads
  // as an inset instead: cut the canvas at the opaque panel's own edge and let
  // the shadow survive only on the left and the top.
  const { stdout } = await run("magick", [
    out,
    "-alpha",
    "extract",
    "-threshold",
    "70%",
    "-format",
    "%@",
    "info:",
  ]);
  const box = /^(\d+)x(\d+)\+(\d+)\+(\d+)$/.exec(stdout.trim());
  if (box) {
    const [, w, h, x, y] = box.map(Number);
    // WindowHop's switcher is a rounded panel that is wider than it is tall, so
    // the tile scales it to fit the width and its rounded bottom-left corner
    // lands inside the card instead of running off it. Cutting the last tenth
    // of the panel both hides that corner and makes the drawing sit lower and
    // larger in the tile.
    const bottom = slug === "windowhop" ? Math.round((y + h) * 0.9) : y + h;
    await run("magick", [out, "-crop", `${x + w}x${bottom}+0+0`, "+repage", out]);
  }
  process.stdout.write(`${slug}.png written\n`);
}

await browser.close();
