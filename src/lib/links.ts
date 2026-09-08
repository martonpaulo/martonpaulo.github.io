import type { CollectionEntry } from "astro:content";

export type Link = CollectionEntry<"links">["data"];

export const isEmailLink = (link: Pick<Link, "url">) => link.url.startsWith("mailto:");
export const isExternalLink = (link: Pick<Link, "url">) => !isEmailLink(link);

/** Every link that leaves the site opens in a new tab and drops the referrer. */
export const externalLinkAttributes = { target: "_blank", rel: "noopener noreferrer" } as const;
