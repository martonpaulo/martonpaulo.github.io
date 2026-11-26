// Where each project leads (#57). No runtime imports, so astro.config.ts and `node --test` load this
// file directly, and the pages, the redirects and the tests share one rule.

export interface TargetProject {
  slug: string;
  status: string;
  links: { live?: string | undefined; source?: string | undefined };
}

export interface TargetEntry {
  slug: string;
  project?: string;
  planned?: boolean;
}

/** A project still made or kept running: anything not discontinued. */
const isCurrent = (project: TargetProject) => project.status !== "discontinued";

/**
 * Whether the portfolio builds a page for the project: a current project with no public site of
 * its own (Panoram, Workbench, DELE Diario). Every other project leads somewhere else (#57).
 */
export function hasPage(project: TargetProject): boolean {
  return isCurrent(project) && !project.links.live;
}

/** A project page's path: at the site's root, beside the paths GitHub serves for each repository. */
export function pagePath(project: Pick<TargetProject, "slug">): string {
  return `/${project.slug}/`;
}

/** Where a current project's card and row lead: its own site, else its page (#57). */
export function projectTarget(project: TargetProject): { href: string; external: boolean } {
  return project.links.live
    ? { href: project.links.live, external: true }
    : { href: pagePath(project), external: false };
}

/**
 * Where the old /projects/<slug>/ URL of a project leads now (#57): a current project's target; a
 * retired one's frozen build in the archive, or its live site while its folder is planned, or the
 * Earlier work tab when it has neither.
 */
export function oldPageTarget(
  project: TargetProject,
  earlier: TargetEntry[],
  archive: string,
  earlierPath: string,
): string {
  if (isCurrent(project)) return projectTarget(project).href;
  const entry = earlier.find((item) => item.project === project.slug);
  if (entry && !entry.planned) return `${archive}${entry.slug}/`;
  return project.links.live ?? earlierPath;
}
