import type { CollectionEntry } from "astro:content";

type Site = CollectionEntry<"site">["data"];

const TITLE_SEPARATOR = " · ";

/** "Page · Site name", or the site's own title on the home page. */
export function pageTitle(site: Site, title?: string): string {
  return title ? `${title}${TITLE_SEPARATOR}${site.name}` : site.title;
}

/** The site's one share image (src/pages/og/site.png.ts): every page links to it. */
export const SHARE_IMAGE = "/og/site.png";
