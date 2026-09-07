import type { CollectionEntry } from "astro:content";

type Site = CollectionEntry<"site">["data"];

const TITLE_SEPARATOR = " · ";
const DEFAULT_SHARE_IMAGE = "/og/site.png";

/** "Page · Site name", or the site's own title on the home page. */
export function pageTitle(site: Site, title?: string): string {
  return title ? `${title}${TITLE_SEPARATOR}${site.name}` : site.title;
}

export const shareImage = (path?: string) => path ?? DEFAULT_SHARE_IMAGE;

/** The share-image path for a page id rendered by src/pages/og/[id].png.ts. */
export const shareImageFor = (id: string) => `/og/${id}.png`;
