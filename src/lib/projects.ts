import type { CollectionEntry } from "astro:content";

import type { projectKinds, tileColors } from "../content.config";
import { type Copy, fill, listOf } from "./copy";

export type Project = CollectionEntry<"projects">["data"];
export type ProjectKind = (typeof projectKinds)[number];
export type TileColor = (typeof tileColors)[number];

/** Tiles cycle through the palette when a project declares none. */
const tileCycle: TileColor[] = [
  "sage",
  "salmon",
  "lavender",
  "cream",
  "sky",
  "mint",
  "peach",
  "lilac",
];

export function tileFor(project: Project, index: number): TileColor {
  return project.tile ?? tileCycle[index % tileCycle.length]!;
}

/**
 * What a tile is painted with. A project whose social card exists carries a
 * tint softened from that card, so the tile and the card read as one product;
 * the named palette is the fallback for anything without a card yet.
 */
export function tileValue(project: Project, index: number): string {
  return project.tint ?? `var(--tile-${tileFor(project, index)})`;
}

export interface ProjectLink {
  label: string;
  url: string;
}

/**
 * The outbound links of a project, labelled for what the visitor will find
 * there. A project's live link is always its own page, never a file, so an app
 * opens like everything else instead of promising a download.
 */
export function projectLinks(project: Project, copy: Copy["project"]): ProjectLink[] {
  const { live, source, package: pkg } = project.links;
  return [
    live && { label: copy.open, url: live },
    source && { label: copy.source, url: source },
    pkg && { label: copy.package, url: pkg },
  ].filter((link): link is ProjectLink => Boolean(link));
}

/**
 * What a project is, in words. A project can belong to more than one kind —
 * Smart Desk ships for iPhone and for Mac — and reading "iOS app · macOS app"
 * beside the year, which is also separated by "·", parses as three facts
 * rather than two. When the labels end in the same noun, it is written once:
 * "iOS and macOS app".
 */
export function kindLabel(project: Project, labels: Copy["kinds"]): string {
  const words = project.kinds.map((kind) => labels[kind].one);
  if (words.length === 1) return words[0]!;
  const tails = words.map((word) => word.split(" ").at(-1));
  const shared = tails.every((tail) => tail === tails[0]);
  const heads = shared ? words.map((word) => word.split(" ").slice(0, -1).join(" ")) : words;
  const last = shared ? `${heads.at(-1)} ${tails[0]}` : words.at(-1);
  return [...heads.slice(0, -1), last].join(" and ");
}

export const projectsPath = "/projects/";

export function projectPath(project: Pick<Project, "slug">): string {
  return `/projects/${project.slug}/`;
}

export function kindPath(kind: ProjectKind): string {
  return `/projects/kind/${kind}/`;
}

export type KindCounts = Record<ProjectKind, number>;

export interface FilterOption {
  key: "all" | ProjectKind;
  label: string;
  href: string;
}

/** "Everything" first, then one chip per kind that has at least one project. */
export function filterOptions(
  counts: KindCounts,
  allLabel: string,
  kinds: Copy["kinds"],
): FilterOption[] {
  const present = (Object.keys(counts) as ProjectKind[]).filter((kind) => counts[kind] > 0);
  return [
    { key: "all", label: allLabel, href: projectsPath },
    ...present.map((kind) => ({ key: kind, label: kinds[kind].many, href: kindPath(kind) })),
  ];
}

/** The label/value rows a project page lists under its description. */
export function projectMetaRows(project: Project, copy: Copy["project"]) {
  return [
    { term: copy.builtWith, value: project.stack.join(", ") },
    { term: copy.year, value: String(project.year) },
    { term: copy.status, value: project.status === "archived" ? copy.archived : copy.maintained },
  ];
}

/** Newer and older neighbours of a project inside an ordered list. */
export function siblingsOf<T>(items: T[], index: number): { newer: T | null; older: T | null } {
  return { newer: items[index - 1] ?? null, older: items[index + 1] ?? null };
}

export function countByKind(projects: Project[], kinds: readonly ProjectKind[]): KindCounts {
  return Object.fromEntries(
    kinds.map((kind) => [kind, projects.filter((project) => project.kinds.includes(kind)).length]),
  ) as KindCounts;
}

/**
 * The search description of a project page: its tagline, who built it with what,
 * and a pointer to the source when there is one. Private projects have no source
 * link, so they never promise one.
 */
export function projectDescription(
  project: Project,
  copy: Copy["project"],
  author: string,
): string {
  const base = fill(copy.description, {
    tagline: project.tagline,
    author,
    stack: listOf(project.stack),
  });
  return project.links.source ? `${base} ${copy.descriptionSource}` : base;
}
