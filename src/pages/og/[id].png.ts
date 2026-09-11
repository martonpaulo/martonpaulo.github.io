import { readFile } from "node:fs/promises";
import path from "node:path";

import { Resvg } from "@resvg/resvg-js";
import type { APIRoute, GetStaticPaths } from "astro";
import satori from "satori";

import { fill } from "../../lib/copy";
import { getCopy, getPerson, getProjects, getSite } from "../../lib/db";
import { woffToSfnt } from "../../lib/fonts";
import type { FixedShareImageId } from "../../lib/pages";

// Colours mirror the tokens in src/styles/tokens.scss. Satori cannot read a
// stylesheet, so these are copies by hand: when a token moves, its copy moves.
const BG = "#172630";
const TEXT = "#e9ebf0";
const MUTED = "#c9d0da";
const PRIMARY = "#7fd0e6";
const HEADING = "#f6f7f9";
const MARK_SHADOW = "#2a6f8f";

const WIDTH = 1200;
const HEIGHT = 630;

const EYEBROW_SIZE = 24;
const EYEBROW_TRACKING = "0.18em";
// One tracking step plus the space the font would have drawn, so a word gap
// always reads wider than the gap between two letters of the same word.
const EYEBROW_WORD_GAP = 20;

type Card = {
  eyebrow: string;
  title: string;
  subtitle: string;
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
]);

export const getStaticPaths: GetStaticPaths = async () => {
  const site = await getSite();
  const person = await getPerson();
  const projects = await getProjects();
  const { kinds, nav, projects: projectsCopy, about, og } = await getCopy();

  // Typed by the shared id list, so a card added here without reserving its
  // slug, or reserved without a card, stops type-checking.
  const fixed: Record<FixedShareImageId, Card> = {
    site: {
      eyebrow: person.role,
      title: person.name,
      subtitle: person.tagline,
    },
    projects: {
      eyebrow: nav.work,
      title: projectsCopy.title,
      subtitle: fill(og.workSubtitle, { count: projects.length, host: new URL(site.url).host }),
    },
    about: {
      eyebrow: nav.about,
      title: fill(about.title, { givenName: person.givenName }),
      subtitle: person.role,
    },
  };

  return [
    ...Object.entries(fixed).map(([id, card]) => ({ params: { id }, props: card })),
    ...projects.map((project) => ({
      params: { id: project.slug },
      props: {
        eyebrow: `${kinds[project.kind].one} · ${project.year}`,
        title: project.name,
        subtitle: project.tagline,
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
    style: { display: "flex", gap, ...style },
    children: content.split(" ").map((word) => text(word, {})),
  },
});

export const GET: APIRoute = async ({ props }) => {
  const { eyebrow, title, subtitle } = props as Card;
  const site = await getSite();

  const [display, body] = await fonts;

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: BG,
          color: TEXT,
          fontFamily: "Figtree",
        },
        children: [
          {
            type: "div",
            props: {
              style: { display: "flex", alignItems: "center", gap: 18, fontSize: 26, color: MUTED },
              children: [
                {
                  type: "svg",
                  props: {
                    width: 44,
                    height: 44,
                    viewBox: "0 0 24 24",
                    fill: "none",
                    children: [
                      {
                        type: "path",
                        props: {
                          d: "M10.5 4.5h-5v17h5M15.5 4.5h5v17h-5",
                          stroke: MARK_SHADOW,
                          strokeWidth: 2.4,
                          strokeLinecap: "square",
                        },
                      },
                      {
                        type: "path",
                        props: {
                          d: "M9 3H4v17h5M16 3h5v17h-5",
                          stroke: PRIMARY,
                          strokeWidth: 2.4,
                          strokeLinecap: "square",
                        },
                      },
                    ],
                  },
                },
                text(site.url.replace("https://", ""), {}),
              ],
            },
          },
          {
            type: "div",
            props: {
              style: { display: "flex", flexDirection: "column", gap: 28 },
              children: [
                trackedWords(eyebrow.toUpperCase(), EYEBROW_WORD_GAP, {
                  fontSize: EYEBROW_SIZE,
                  letterSpacing: EYEBROW_TRACKING,
                  color: PRIMARY,
                }),
                text(title, {
                  fontFamily: "Gabarito",
                  fontWeight: 700,
                  fontSize: title.length > 26 ? 80 : 104,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  color: HEADING,
                }),
                text(subtitle, { fontSize: 30, color: TEXT, lineHeight: 1.4, maxWidth: 960 }),
              ],
            },
          },
        ],
      },
    },
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Gabarito", data: display, weight: 700, style: "normal" },
        { name: "Figtree", data: body, weight: 400, style: "normal" },
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
