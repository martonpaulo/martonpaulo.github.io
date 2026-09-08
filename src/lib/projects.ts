import type { CollectionEntry } from "astro:content";

import type { projectKinds, tileColors } from "../content.config";
import type { Copy } from "./copy";

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

export interface ProjectLink {
  label: string;
  url: string;
}

/** The outbound links of a project, labelled for what the visitor will find there. */
export function projectLinks(project: Project, copy: Copy["project"]): ProjectLink[] {
  const { live, source, package: pkg } = project.links;
  const isApp = project.kind === "macos" || project.kind === "ios";
  return [
    live && { label: isApp ? copy.download : copy.open, url: live },
    source && { label: copy.source, url: source },
    pkg && { label: copy.package, url: pkg },
  ].filter((link): link is ProjectLink => Boolean(link));
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
    kinds.map((kind) => [kind, projects.filter((project) => project.kind === kind).length]),
  ) as KindCounts;
}
