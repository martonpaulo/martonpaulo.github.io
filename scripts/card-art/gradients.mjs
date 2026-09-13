// A tile is painted with the gradient of the product's own social card, so the
// two read as one product. The value is the card's CSS, copied as written, not a
// colour sampled from its picture: the card's `--gradient`, or the `.card`
// background a card sets instead when it draws something a gradient cannot.
//
// The text on a tile takes whichever ink reads better against the gradient's
// first stop, which is the corner the copy sits in. The gradient itself is never
// lightened or darkened to suit an ink.
//
// The card sources live in the product repositories, checked out beside this
// one. Run `pnpm card-gradients` after a card changes; it rewrites
// db/projects.json. A project whose repository draws no card keeps its palette tile.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SIBLINGS = path.resolve(process.cwd(), "..");
const CARD = "design/social-card/social-card.html";

// The two inks a tile can take, as the tokens in src/styles/tokens.scss define them.
const INKS = { dark: "#16222a", light: "#ffffff" };

const channels = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255);

// WCAG 2 relative luminance and contrast ratio.
const luminance = (hex) => {
  const [r, g, b] = channels(hex).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** The background the card paints: its `.card { background }` override, else its `--gradient`. */
function cardBackground(html) {
  const override = html.match(/\n\.card\s*\{\s*background:\s*([^;}]+)[;}]/);
  const gradient = html.match(/--gradient:\s*([^;]+);/);
  const value = (override ?? gradient)?.[1].trim();
  return value;
}

const projectsPath = path.join(process.cwd(), "db", "projects.json");
const projects = JSON.parse(await readFile(projectsPath, "utf8"));

for (const project of projects) {
  let html;
  try {
    html = await readFile(path.join(SIBLINGS, project.slug, CARD), "utf8");
  } catch {
    process.stdout.write(`${project.slug}: no card, keeps its palette tile\n`);
    continue;
  }
  const background = cardBackground(html);
  const firstStop = background?.match(/#[0-9a-f]{6}/i)?.[0];
  if (!background || !firstStop) {
    process.stdout.write(`${project.slug}: card has no readable background, left as it is\n`);
    continue;
  }
  const ink = contrast(INKS.light, firstStop) > contrast(INKS.dark, firstStop) ? "light" : "dark";
  project.gradient = background;
  project.ink = ink;
  process.stdout.write(`${project.slug}: ${ink} ink on ${background}\n`);
}

await writeFile(projectsPath, `${JSON.stringify(projects, null, 2)}\n`);
