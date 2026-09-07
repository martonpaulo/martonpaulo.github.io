import type { APIRoute } from "astro";
import sharp from "sharp";

// iOS ignores SVG icons and paints its own background behind transparency,
// so the touch icon is the bracket mark on solid paper, rasterised at build.
const SIZE = 180;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${SIZE}" height="${SIZE}">
  <rect width="24" height="24" fill="#f4f1ea"/>
  <g fill="none" stroke-width="2.2" stroke-linecap="square" transform="translate(0 0.5) scale(0.96) translate(0.5 0)">
    <path d="M10.5 4.5h-5v17h5M15.5 4.5h5v17h-5" stroke="#c4cbf3"/>
    <path d="M9 3H4v17h5M16 3h5v17h-5" stroke="#1f3bd6"/>
  </g>
</svg>`;

export const GET: APIRoute = async () => {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
