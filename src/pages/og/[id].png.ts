import { readFile } from "node:fs/promises";
import path from "node:path";

import { Resvg } from "@resvg/resvg-js";
import type { APIRoute, GetStaticPaths } from "astro";
import satori from "satori";

import { fill } from "../../lib/copy";
import { getCopy, getPerson, getProjects, getSite } from "../../lib/db";

// Colours mirror the tokens in src/styles/global.css.
const BG = "#1f302b";
const TEXT = "#e9efe9";
const MUTED = "#b2c3b8";
const PRIMARY = "#9acdff";
const MARK_SHADOW = "#3e7d5c";

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
  fontFile("@fontsource/gabarito", "gabarito-latin-700-normal.woff"),
  fontFile("@fontsource/figtree", "figtree-latin-400-normal.woff"),
]);

export const getStaticPaths: GetStaticPaths = async () => {
  const site = await getSite();
  const person = await getPerson();
  const projects = await getProjects();
  const { kinds, nav, work, about, og } = await getCopy();

  const fixed: Record<string, Card> = {
    site: {
      eyebrow: person.role,
      title: person.name,
      subtitle: person.tagline,
    },
    work: {
      eyebrow: nav.work,
      title: work.archiveHeading,
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
                text(eyebrow.toUpperCase(), {
                  fontSize: 24,
                  letterSpacing: "0.18em",
                  color: MUTED,
                }),
                text(title, {
                  fontFamily: "Gabarito",
                  fontWeight: 700,
                  fontSize: title.length > 26 ? 80 : 104,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  color: PRIMARY,
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
