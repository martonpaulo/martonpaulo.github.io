import { readFile } from "node:fs/promises";
import path from "node:path";

import { Resvg } from "@resvg/resvg-js";
import type { APIRoute } from "astro";
import satori from "satori";

import { getPerson, getSite } from "../../lib/db";
import { woffToSfnt } from "../../lib/fonts";

// The site's one share image: every page links to it (owner decision, 2026-09-11), so a link to
// any path previews as the home page does.

// Colours mirror the tokens in src/styles/tokens.scss. Satori cannot read a
// stylesheet, so these are copies by hand: when a token moves, its copy moves.
const TEXT = "#e9ebf0";
const MUTED = "#c9d0da";
const HEADING = "#f6f7f9";
const TAGLINE = "#a8e2f2";

const WIDTH = 1200;
const HEIGHT = 630;
// The shared social card grid (skill-deck#261): the copy block sits in a column at x=96.
const COPY_LEFT = 96;

// Fontsource ships static WOFF files; the site itself loads the same families
// through Astro's font provider. They are unpacked before satori sees them:
// woffToSfnt says why.
const fontFile = async (pkg: string, file: string) =>
  woffToSfnt(await readFile(path.join(process.cwd(), "node_modules", pkg, "files", file)));

// The ground: the page glow and the products' icon wall, rendered by `npm run share-ground`
// from scripts/share-home/ground.html because satori cannot draw perspective or blur.
const groundFile = path.join(process.cwd(), "src", "assets", "share", "home-ground.png");

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
    style: { display: "flex", columnGap: gap, ...style },
    children: content.split(" ").map((word) => text(word, {})),
  },
});

export const GET: APIRoute = async () => {
  const site = await getSite();
  const person = await getPerson();
  const [display, body, bodyMedium, ground] = await Promise.all([
    fontFile("@fontsource/gabarito", "gabarito-latin-700-normal.woff"),
    fontFile("@fontsource/figtree", "figtree-latin-400-normal.woff"),
    fontFile("@fontsource/figtree", "figtree-latin-500-normal.woff"),
    readFile(groundFile),
  ]);

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          position: "relative",
          display: "flex",
          width: WIDTH,
          height: HEIGHT,
          color: TEXT,
          fontFamily: "Figtree",
        },
        children: [
          {
            type: "img",
            props: {
              src: `data:image/png;base64,${ground.toString("base64")}`,
              style: { position: "absolute", left: 0, top: 0, width: WIDTH, height: HEIGHT },
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                left: COPY_LEFT,
                top: 0,
                width: 640,
                height: HEIGHT,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "flex-start",
              },
              children: [
                // The tagline on one line in tracked capitals; the role, the information that
                // matters most after the name, sits under it at reading size.
                trackedWords(person.tagline.toUpperCase(), 10, {
                  fontSize: 20,
                  fontWeight: 500,
                  letterSpacing: "0.16em",
                  color: TAGLINE,
                }),
                // The name is the headline: large, on two lines, clear of the icon wall.
                text(person.name, {
                  fontFamily: "Gabarito",
                  fontWeight: 700,
                  fontSize: 132,
                  lineHeight: 0.95,
                  letterSpacing: "-0.035em",
                  color: HEADING,
                  marginTop: 22,
                  maxWidth: 470,
                }),
                // Two lines, broken after the title ("Senior full-stack developer / and vibe coder").
                text(person.role, {
                  fontSize: 36,
                  fontWeight: 500,
                  lineHeight: 1.25,
                  marginTop: 20,
                  maxWidth: 480,
                }),
                text(site.url.replace("https://", ""), {
                  fontSize: 25,
                  color: MUTED,
                  marginTop: 30,
                }),
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
