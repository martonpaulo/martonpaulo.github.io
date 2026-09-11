import type { APIRoute } from "astro";
import sharp from "sharp";

// iOS ignores SVG icons, so the touch icon is public/favicon.svg rasterised at build, full-bleed
// (iOS rounds the corners itself). Colours mirror src/styles/tokens.scss.
const SIZE = 180;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${SIZE}" height="${SIZE}">
  <rect width="24" height="24" fill="#7fd0e6"/>
  <path d="M10 6.5H6.5v11H10M14 6.5h3.5v11H14" fill="none" stroke="#172630" stroke-width="2.4" stroke-linecap="square"/>
</svg>`;

export const GET: APIRoute = async () => {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
