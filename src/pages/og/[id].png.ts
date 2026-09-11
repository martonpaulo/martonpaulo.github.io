import { readFile } from "node:fs/promises";
import path from "node:path";

import { Resvg } from "@resvg/resvg-js";
import type { APIRoute, GetStaticPaths } from "astro";
import satori from "satori";
import sharp from "sharp";

import { fill } from "../../lib/copy";
import { getCopy, getPerson, getProjects, getSite } from "../../lib/db";
import { woffToSfnt } from "../../lib/fonts";
import type { FixedShareImageId } from "../../lib/pages";
import { tileFor, type TileColor } from "../../lib/projects";

// Colours mirror the tokens in src/styles/tokens.scss. Satori cannot read a
// stylesheet, so these are copies by hand: when a token moves, its copy moves.
const BG = "#172630";
const BG_GLOW = "#2a6f8f";
const BG_GLOW_COOL = "#2b8a7a";
const TEXT = "#e9ebf0";
const MUTED = "#c9d0da";
const PRIMARY = "#7fd0e6";
const HEADING = "#f6f7f9";
const TILE_INK = "#16222a";
const TILE_INK_MUTED = "#344149";
const TILES: Record<TileColor, string> = {
  lilac: "#d5b8ea",
  mint: "#b3e0d0",
  salmon: "#efb9a6",
  sky: "#bdd8f5",
  cream: "#f3e8d0",
  sage: "#bfd4c8",
  peach: "#f3cfbc",
  lavender: "#cbcbf3",
};

const WIDTH = 1200;
const HEIGHT = 630;

// The shared social card grid (skill-deck#261): the copy block sits in a column at x=96,
// centred vertically; the visual starts at x=600 and runs off the right and bottom edges.
const COPY_LEFT = 96;
const COPY_WIDTH = 440;
const VISUAL_LEFT = 600;

const EYEBROW_SIZE = 20;
const EYEBROW_TRACKING = "0.16em";
// One tracking step plus the space the font would have drawn, so a word gap
// always reads wider than the gap between two letters of the same word.
const EYEBROW_WORD_GAP = 14;

type Art = { slug: string; fit: "cover" | "object" | "contain"; tile: TileColor };
type MosaicTile = Art & { kind: string; name: string };

type Card = {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** A project's own tile with its artwork, as the site draws it. */
  art?: Art | undefined;
  /** The fixed pages show the featured tiles, as the home page does. */
  mosaic?: MosaicTile[];
  /** The home card: the copy over its own rendered ground (scripts/share-home/ground.html). */
  home?: boolean;
};

// Fontsource ships static WOFF files; the site itself loads the same families
// through Astro's font provider. They are unpacked before satori sees them:
// woffToSfnt says why.
const fontFile = async (pkg: string, file: string) =>
  woffToSfnt(await readFile(path.join(process.cwd(), "node_modules", pkg, "files", file)));

// Read once for the whole build rather than once per image.
const fonts = Promise.all([
  fontFile("@fontsource/gabarito", "gabarito-latin-700-normal.woff"),
  fontFile("@fontsource/figtree", "figtree-latin-400-normal.woff"),
  fontFile("@fontsource/figtree", "figtree-latin-500-normal.woff"),
]);

// The home card's ground: the page glow and the products' icon wall, rendered by
// `npm run share-ground` because satori cannot draw perspective or blur.
const homeGround = readFile(
  path.join(process.cwd(), "src", "assets", "share", "home-ground.png"),
).then((png) => `data:image/png;base64,${png.toString("base64")}`);

// Project artwork lives at src/assets/projects/<slug>.png. It is scaled down once per card
// before satori embeds it: the source files are up to 2,268 pixels wide.
// satori needs both dimensions of an image, so the aspect ratio travels with it.
const artwork = async (slug: string, width: number) => {
  const file = path.join(process.cwd(), "src", "assets", "projects", `${slug}.png`);
  const { data, info } = await sharp(file)
    .resize({ width, withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true });
  return {
    src: `data:image/png;base64,${data.toString("base64")}`,
    ratio: info.height / info.width,
  };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const site = await getSite();
  const person = await getPerson();
  const projects = await getProjects();
  const { kinds, nav, projects: projectsCopy, about, og } = await getCopy();

  // A project's tile colour is the one the site gives it (its own, or its place in the cycle),
  // and only projects with artwork can be drawn as a tile.
  const artFor = (index: number): Art | undefined => {
    const project = projects[index]!;
    return project.image
      ? { slug: project.slug, fit: project.image.fit, tile: tileFor(project, index) }
      : undefined;
  };
  const mosaic: MosaicTile[] = projects
    .map((project, index) => ({ project, art: artFor(index) }))
    .filter(({ project, art }) => project.featured && art)
    .slice(0, 4)
    .map(({ project, art }) => ({ ...art!, kind: kinds[project.kind].one, name: project.name }));

  // Typed by the shared id list, so a card added here without reserving its
  // slug, or reserved without a card, stops type-checking.
  const fixed: Record<FixedShareImageId, Card> = {
    site: {
      eyebrow: person.role,
      title: person.name,
      subtitle: person.tagline,
      home: true,
    },
    projects: {
      eyebrow: nav.work,
      title: projectsCopy.title,
      subtitle: fill(og.workSubtitle, { count: projects.length, host: new URL(site.url).host }),
      mosaic,
    },
    about: {
      eyebrow: nav.about,
      title: fill(about.title, { givenName: person.givenName }),
      subtitle: person.role,
      mosaic,
    },
  };

  return [
    ...Object.entries(fixed).map(([id, card]) => ({ params: { id }, props: card })),
    ...projects.map((project, index) => ({
      params: { id: project.slug },
      props: {
        eyebrow: `${kinds[project.kind].one} · ${project.year}`,
        title: project.name,
        subtitle: project.tagline,
        art: artFor(index),
      } satisfies Card,
    })),
  ];
};

const text = (content: string, style: Record<string, unknown>) => ({
  type: "div",
  props: { style: { display: "flex", ...style }, children: content },
});

// satori puts letter-spacing between letters but not around the space glyph,
// so a tracked line ends up with word gaps narrower than its letter gaps —
// "FULL-STACK DEVELOPER" came out as one word. Laying the words out as flex
// children with a gap of their own keeps the tracking and the reading.
const trackedWords = (content: string, gap: number, style: Record<string, unknown>) => ({
  type: "div",
  props: {
    // Wraps inside its column: a role can be longer than the column is wide.
    style: { display: "flex", flexWrap: "wrap", columnGap: gap, rowGap: 8, ...style },
    children: content.split(" ").map((word) => text(word, {})),
  },
});

const box = (style: Record<string, unknown>, children: unknown[] = []) => ({
  type: "div",
  props: { style: { display: "flex", ...style }, children },
});

const image = (src: string, style: Record<string, unknown>) => ({
  type: "img",
  props: { src, style },
});

// The site's mark, drawn as its favicon: the brackets in page ink on an aqua tile.
const mark = {
  type: "svg",
  props: {
    width: 72,
    height: 72,
    viewBox: "0 0 24 24",
    children: [
      { type: "rect", props: { width: 24, height: 24, rx: 5.5, fill: PRIMARY } },
      {
        type: "path",
        props: {
          d: "M10 6.5H6.5v11H10M14 6.5h3.5v11H14",
          fill: "none",
          stroke: BG,
          strokeWidth: 2.4,
          strokeLinecap: "square",
        },
      },
    ],
  },
};

// The site's labels sit inside brackets (Eyebrow.scss); the card keeps them.
const eyebrowLine = (content: string, color: string, size: number) =>
  trackedWords(`[ ${content.toUpperCase()} ]`, EYEBROW_WORD_GAP, {
    fontSize: size,
    letterSpacing: EYEBROW_TRACKING,
    color,
  });

// Where the artwork sits on a tile follows the site's three fits (ProjectCard.scss): a
// screenshot anchored to the right and bottom edges, a whole panel centred, or an icon.
const artOnTile = async (art: Art, tileWidth: number, tileHeight: number, top: number) => {
  const inset = Math.round(tileWidth * 0.08);
  if (art.fit === "cover") {
    const width = tileWidth - inset + 40;
    const { src, ratio } = await artwork(art.slug, width * 2);
    return image(src, {
      position: "absolute",
      left: inset,
      top,
      width,
      height: Math.round(width * ratio),
      borderTopLeftRadius: 14,
    });
  }
  const width = art.fit === "object" ? tileWidth - inset * 2 : Math.round(tileWidth * 0.46);
  const height = tileHeight - top - inset;
  return box(
    {
      position: "absolute",
      left: 0,
      top,
      width: tileWidth,
      height,
      justifyContent: "center",
      alignItems: "center",
    },
    [await fitted(art.slug, width, height)],
  );
};

// An object or an icon keeps its proportions inside the box it is given.
const fitted = async (slug: string, maxWidth: number, maxHeight: number) => {
  const { src, ratio } = await artwork(slug, maxWidth * 2);
  const width = Math.min(maxWidth, Math.round(maxHeight / ratio));
  return image(src, { width, height: Math.round(width * ratio) });
};

const projectTile = async (art: Art) => {
  const width = 640;
  // Taller than the space below it, so the tile runs off the bottom edge like the site's art.
  const height = 580;
  return box(
    {
      position: "absolute",
      left: VISUAL_LEFT,
      top: 90,
      width,
      height,
      borderRadius: 34,
      overflow: "hidden",
      background: TILES[art.tile],
      boxShadow: "0 30px 70px rgba(8, 16, 22, 0.45)",
    },
    [await artOnTile(art, width, height, 56)],
  );
};

const mosaicTiles = async (tiles: MosaicTile[]) => {
  const width = 300;
  const height = 262;
  const gap = 20;
  return box(
    {
      position: "absolute",
      left: VISUAL_LEFT,
      top: 42,
      width: width * 2 + gap,
      height: height * 2 + gap,
      flexWrap: "wrap",
      gap,
    },
    await Promise.all(
      tiles.map(async (tile) =>
        box(
          {
            position: "relative",
            width,
            height,
            borderRadius: 26,
            overflow: "hidden",
            background: TILES[tile.tile],
            flexDirection: "column",
            padding: "20px 22px",
            boxShadow: "0 24px 50px rgba(8, 16, 22, 0.4)",
          },
          [
            eyebrowLine(tile.kind, TILE_INK_MUTED, 11),
            text(tile.name, {
              fontFamily: "Gabarito",
              fontWeight: 700,
              fontSize: 27,
              color: TILE_INK,
              marginTop: 6,
            }),
            await artOnTile(tile, width, height, 96),
          ],
        ),
      ),
    ),
  );
};

const homeCopy = (role: string, name: string, tagline: string, host: string) =>
  box(
    {
      position: "absolute",
      left: COPY_LEFT,
      top: 0,
      width: 640,
      height: HEIGHT,
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "flex-start",
    },
    [
      // The tagline on one line in tracked capitals; the role, the information that matters most
      // after the name, sits under it at reading size.
      trackedWords(tagline.toUpperCase(), 10, {
        fontSize: 17,
        fontWeight: 500,
        letterSpacing: "0.16em",
        color: "#a8e2f2",
        flexWrap: "nowrap",
      }),
      // The name is the card's headline: large, on two lines, so it grows without reaching the wall.
      text(name, {
        fontFamily: "Gabarito",
        fontWeight: 700,
        fontSize: 118,
        lineHeight: 0.95,
        letterSpacing: "-0.035em",
        color: HEADING,
        marginTop: 22,
        maxWidth: 430,
      }),
      // Two lines, broken after the title ("Senior full-stack developer / and vibe coder").
      text(role, {
        fontSize: 32,
        fontWeight: 500,
        lineHeight: 1.25,
        color: TEXT,
        marginTop: 20,
        maxWidth: 420,
      }),
      text(host, { fontSize: 22, color: MUTED, marginTop: 30 }),
    ],
  );

export const GET: APIRoute = async ({ props }) => {
  const { eyebrow, title, subtitle, art, mosaic, home } = props as Card;
  const site = await getSite();

  const [display, body, bodyMedium] = await fonts;
  const host = site.url.replace("https://", "");
  const visual = home
    ? image(await homeGround, {
        position: "absolute",
        left: 0,
        top: 0,
        width: WIDTH,
        height: HEIGHT,
      })
    : art
      ? await projectTile(art)
      : mosaic?.length
        ? await mosaicTiles(mosaic)
        : null;
  // Without a visual the copy has the whole card; with one, it keeps to its column.
  const copyWidth = visual ? COPY_WIDTH : WIDTH - COPY_LEFT * 2;
  const titleSize = visual ? (title.length > 13 ? 76 : 88) : title.length > 26 ? 88 : 112;

  const svg = await satori(
    box(
      {
        position: "relative",
        width: WIDTH,
        height: HEIGHT,
        overflow: "hidden",
        backgroundColor: BG,
        // The page glow of the site (Base.astro): a cool wash from the top left and a
        // greener one from the bottom right.
        backgroundImage: `radial-gradient(circle at 12% 0%, ${BG_GLOW} 0%, transparent 58%), radial-gradient(circle at 100% 100%, ${BG_GLOW_COOL} 0%, transparent 55%)`,
        color: TEXT,
        fontFamily: "Figtree",
      },
      [
        ...(visual ? [visual] : []),
        home
          ? homeCopy(eyebrow, title, subtitle, host)
          : box(
              {
                position: "absolute",
                left: COPY_LEFT,
                top: 0,
                width: copyWidth,
                height: HEIGHT,
                flexDirection: "column",
                justifyContent: "center",
              },
              [
                box({ marginBottom: 30 }, [mark]),
                eyebrowLine(eyebrow, PRIMARY, EYEBROW_SIZE),
                text(title, {
                  fontFamily: "Gabarito",
                  fontWeight: 700,
                  fontSize: titleSize,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  color: HEADING,
                  marginTop: 20,
                }),
                text(subtitle, { fontSize: 32, color: TEXT, lineHeight: 1.3, marginTop: 20 }),
                text(host, { fontSize: 22, color: MUTED, marginTop: 30 }),
              ],
            ),
      ],
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Gabarito", data: display, weight: 700, style: "normal" },
        { name: "Figtree", data: body, weight: 400, style: "normal" },
        { name: "Figtree", data: bodyMedium, weight: 500, style: "normal" },
      ],
    },
  );

  // satori emits glyph outlines, so resvg needs no fonts; scanning the system
  // font database is what made each render take seconds instead of milliseconds.
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: WIDTH },
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng();

  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
