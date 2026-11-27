import type { CollectionEntry } from "astro:content";

import type { Copy } from "./copy";
import { projectIcon } from "./images";
import type { Project, RowItem } from "./projects";
import { periodLabel } from "./status";

export type EarlierEntry = CollectionEntry<"earlier">["data"];

/**
 * An Earlier work entry as a row (#42). A built one links to its frozen build at
 * <archive><slug>/; a planned one, not there yet, to its product's live site, since a retired
 * project has no page of its own (#57). A Project
 * reference takes its name, tagline, kinds and icon from db/projects.json.
 */
export function earlierRow(
  entry: EarlierEntry,
  projects: readonly Project[],
  archive: string,
  labels: Copy["kinds"],
): RowItem {
  const project = entry.project ? projects.find((p) => p.slug === entry.project) : undefined;
  if (entry.project && !project) {
    throw new Error(
      `db/earlier.json: ${entry.slug} names project ${entry.project}, which does not exist`,
    );
  }
  const name = project?.name ?? entry.name;
  const tagline = project?.tagline ?? entry.tagline;
  const kinds = project?.kinds ?? entry.kinds;
  if (!name || !tagline || !kinds) throw new Error(`db/earlier.json: ${entry.slug} is incomplete`);
  const planned = entry.planned === true;
  const live = project?.links.live;
  if (planned && !live) {
    throw new Error(`db/earlier.json: ${entry.slug} is planned, yet has no live site to link to`);
  }
  return {
    key: entry.slug,
    name,
    href: planned && live ? live : `${archive}${entry.slug}/`,
    external: planned ? "site" : "archive",
    tagline,
    icon: projectIcon(project?.slug ?? entry.slug),
    kinds: kinds.map((kind) => labels[kind].one),
    figures: [],
    when: periodLabel(entry.period),
    retired: true,
  };
}
