import type { CollectionEntry } from "astro:content";

import type { projectKinds, tileColors } from "../content.config";
import { type Copy, fill, listOf, lowerFirst } from "./copy";
import { projectIcon } from "./images";
import { isDiscontinued, monthYear } from "./status";

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
 * What a tile is painted with. A project whose social card exists carries that
 * card's own gradient, so the tile and the card read as one product; the named
 * palette is the fallback for anything without a card yet.
 */
export function tileValue(project: Project, index: number): string {
  return project.gradient ?? `var(--tile-${tileFor(project, index)})`;
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
 * What a project is, in words: every kind it has, each in full, as its card and page show them
 * ("iOS app · macOS app"). A suite such as Ink Tools has several (#43).
 */
export function kindLabels(project: Project, labels: Copy["kinds"]): string[] {
  return project.kinds.map((kind) => labels[kind].one);
}

export const projectsPath = "/projects/";

export function projectPath(project: Pick<Project, "slug">): string {
  return `/projects/${project.slug}/`;
}

export function kindPath(kind: ProjectKind): string {
  return `/projects/kind/${kind}/`;
}

/** The Earlier work tab (#42); noindex and out of the sitemap, like the pages it lists. */
export const earlierPath = "/projects/earlier/";

/** One line of a list, whichever list it is in: what ProjectRow draws. */
export interface RowItem {
  key: string;
  name: string;
  href: string;
  /** The link leaves the site, so it opens in a new tab. */
  external: boolean;
  tagline: string;
  icon: ImageMetadata;
  /** Each kind, linked to its tab when the row is in a current list. */
  kinds: { label: string; href?: string }[];
  /** The year, or the period of an Earlier work entry. */
  when: string;
  /** An Earlier work entry: drawn muted until it is pointed at or focused (#43). */
  retired: boolean;
}

/** A current project as a row: its page, its kinds linked to their tabs, its year. */
export function projectRow(project: Project, labels: Copy["kinds"]): RowItem {
  return {
    key: project.slug,
    name: project.name,
    href: projectPath(project),
    external: false,
    tagline: project.tagline,
    icon: projectIcon(project.slug),
    kinds: project.kinds.map((kind) => ({ label: labels[kind].one, href: kindPath(kind) })),
    when: String(project.year),
    retired: false,
  };
}

export type KindCounts = Record<ProjectKind, number>;

export type FilterKey = "all" | ProjectKind | "earlier";

export interface FilterOption {
  key: FilterKey;
  label: string;
  href: string;
  /** Which of the tab row's three groups the chip is in. */
  group: "all" | "kind" | "earlier";
}

/** "Everything" first, then one chip per kind that has a current project, then Earlier work. */
export function filterOptions(
  counts: KindCounts,
  allLabel: string,
  kinds: Copy["kinds"],
  earlierLabel: string,
): FilterOption[] {
  const present = (Object.keys(counts) as ProjectKind[]).filter((kind) => counts[kind] > 0);
  return [
    { key: "all", label: allLabel, href: projectsPath, group: "all" },
    ...present.map((kind) => ({
      key: kind,
      label: kinds[kind].many,
      href: kindPath(kind),
      group: "kind" as const,
    })),
    { key: "earlier", label: earlierLabel, href: earlierPath, group: "earlier" },
  ];
}

/** A kind's plural inside a sentence: "web apps", "macOS apps", "Supernote plugins". */
export function kindInSentence(kind: ProjectKind, kinds: Copy["kinds"]): string {
  return kinds[kind].sentence ?? lowerFirst(kinds[kind].many);
}

/** The sentence under one kind's tab: "Only the web apps: the most-starred first, …". */
export function kindNote(kind: ProjectKind, copy: Copy["projects"], kinds: Copy["kinds"]): string {
  return fill(copy.kindNote, { kind: kindInSentence(kind, kinds) });
}

/**
 * The sentence of every Projects tab, in the tab row's order: Everything, each kind with a current
 * project, Earlier work. Each tab reserves the room of all of them under the tab row, so the list
 * starts at the same place on every tab (#54).
 */
export function tabNotes(counts: KindCounts, copy: Copy): string[] {
  const present = (Object.keys(counts) as ProjectKind[]).filter((kind) => counts[kind] > 0);
  return [
    copy.projects.note,
    ...present.map((kind) => kindNote(kind, copy.projects, copy.kinds)),
    copy.earlier.note,
  ];
}

const statusLabels = {
  active: "maintained",
  archived: "archived",
  discontinued: "discontinued",
} as const satisfies Record<Project["status"], keyof Copy["project"]>;

function statusLabel(project: Project, copy: Copy["project"]): string {
  return copy[statusLabels[project.status]];
}

/**
 * "Discontinued in October 2026." and the reason, or null for a project that
 * still lives.
 */
export function discontinuedNotice(
  project: Project,
  copy: Copy["project"],
  locale: string,
): string | null {
  if (!isDiscontinued(project) || !project.discontinuedOn) return null;
  const when = fill(copy.discontinuedOn, { month: monthYear(project.discontinuedOn, locale) });
  return [when, project.discontinuedReason].filter(Boolean).join(" ");
}

/** The label/value rows a project page lists under its description. */
export function projectMetaRows(project: Project, copy: Copy["project"]) {
  return [
    { term: copy.builtWith, value: project.stack.join(", ") },
    { term: copy.year, value: String(project.year) },
    { term: copy.status, value: statusLabel(project, copy) },
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
