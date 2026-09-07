import type { CollectionEntry } from "astro:content";

export type Link = CollectionEntry<"links">["data"];

export const isEmailLink = (link: Pick<Link, "url">) => link.url.startsWith("mailto:");
export const isExternalLink = (link: Pick<Link, "url">) => !isEmailLink(link);
