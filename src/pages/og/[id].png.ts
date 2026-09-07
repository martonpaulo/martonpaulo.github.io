import { readFile } from "node:fs/promises";
import path from "node:path";

import { Resvg } from "@resvg/resvg-js";
import type { APIRoute, GetStaticPaths } from "astro";
import satori from "satori";

import { getPerson, getProjects, getSite, kindLabels } from "../../lib/db";

// Colours mirror the light tokens in src/styles/global.css; share previews
// are rendered once, so they cannot follow the viewer's colour scheme.
const PAPER = "#f4f1ea";
const INK = "#171a26";
const INK_3 = "#5f6374";
const ACCENT = "#1f3bd6";

const WIDTH = 1200;
const HEIGHT = 630;

type Card = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

// Fontsource ships static WOFF files satori can read; the site itself loads
// the same families through Astro's font provider.
const fontFile = (pkg: string, file: string) =>
  readFile(path.join(process.cwd(), "node_modules", pkg, "files", file));

// Read once for the whole build rather than once per image.
const fonts = Promise.all([
  fontFile("@fontsource/newsreader", "newsreader-latin-400-normal.woff"),
  fontFile("@fontsource/ibm-plex-mono", "ibm-plex-mono-latin-400-normal.woff"),
]);

export const getStaticPaths: GetStaticPaths = async () => {
  const site = await getSite();
  const person = await getPerson();
  const projects = await getProjects();

  const fixed: Record<string, Card> = {
    site: {
      eyebrow: `${person.location} · ${person.availability}`.toLowerCase(),
      title: person.name,
      subtitle: person.role,
    },
    work: {
      eyebrow: "work",
      title: "Everything I've made",
      subtitle: `${projects.length} projects, newest first · ${site.url.replace("https://", "")}`,
    },
    about: {
      eyebrow: "about",
      title: `${person.givenName}, in a few paragraphs`,
      subtitle: person.role,
    },
  };

  return [
    ...Object.entries(fixed).map(([id, card]) => ({ params: { id }, props: card })),
    ...projects.map((project) => ({
      params: { id: project.slug },
      props: {
        eyebrow: `${project.year} · ${kindLabels[project.kind]}`,
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

export const GET: APIRoute = async ({ props }) => {
  const { eyebrow, title, subtitle } = props as Card;
  const site = await getSite();

  const [serif, mono] = await fonts;

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
          background: PAPER,
          color: INK,
          fontFamily: "IBM Plex Mono",
        },
        children: [
          {
            type: "div",
            props: {
              style: { display: "flex", alignItems: "center", gap: 18, fontSize: 26, color: INK_3 },
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
                          stroke: "#c4cbf3",
                          strokeWidth: 2.4,
                          strokeLinecap: "square",
                        },
                      },
                      {
                        type: "path",
                        props: {
                          d: "M9 3H4v17h5M16 3h5v17h-5",
                          stroke: ACCENT,
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
                text(`[ ${eyebrow} ]`, { fontSize: 26, color: ACCENT }),
                text(title, {
                  fontFamily: "Newsreader",
                  fontSize: title.length > 26 ? 76 : 96,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                }),
                text(subtitle, { fontSize: 30, color: INK_3, lineHeight: 1.4, maxWidth: 960 }),
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
        { name: "Newsreader", data: serif, weight: 400, style: "normal" },
        { name: "IBM Plex Mono", data: mono, weight: 400, style: "normal" },
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
