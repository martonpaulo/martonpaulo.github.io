// Whether a project still lives, and what follows from it for the lists.
// No runtime imports, so `node --test` loads this file directly.

interface HasStatus {
  status: "active" | "archived" | "discontinued";
}

export function isDiscontinued(project: HasStatus): boolean {
  return project.status === "discontinued";
}

/**
 * The projects the home page and the project tabs show. A discontinued one is
 * Earlier work and listed only there (#42); the order is kept.
 */
export function currentOnly<T extends HasStatus>(projects: readonly T[]): T[] {
  return projects.filter((project) => !isDiscontinued(project));
}

/** How many projects the home page shows (#43). */
export const HOME_COUNT = 6;

/** A project's GitHub figures, recorded by scripts/metrics.mjs on the day `at` (#43). */
export interface Metrics {
  stars: number;
  forks: number;
  downloads: number;
  release: boolean;
  public: boolean;
  closedIssues: number;
  commits: number;
  recentCommits: number;
}

interface Ranked extends HasStatus {
  name: string;
  links: { live?: string | undefined };
  metrics?: Metrics | undefined;
}

/** The score's weights, in points out of 100 (owner, 2026-11-26, #43). */
const WEIGHT = { use: 40, availability: 30, work: 20, recent: 10 } as const;
const STAR_VALUE = 10;
const FORK_VALUE = 20;
const AVAILABILITY_POINTS = 3;

/** `value` over `highest`, or 0 when `highest` is 0. */
const share = (value: number, highest: number) => (highest > 0 ? value / highest : 0);

/**
 * Each current project's score, 0 to 100, rounded: real use 40 (log10 of 1 + stars × 10 +
 * forks × 20 + release downloads, over the highest among the current projects), public
 * availability 30 (a public repository, a live page on its own subdomain of `siteUrl`, a release
 * with a file to download; one point each, over 3), work invested 20 (log10 of 1 + closed issues
 * + commits, over the highest) and recent activity 10 (commits in the last 90 days over all
 * commits). Only recorded figures are read, so the same data always gives the same scores (#43).
 * A current project with no figures throws: it is never scored as if it had none.
 */
export function projectScores<T extends Ranked>(
  projects: readonly T[],
  siteUrl: string,
): Map<T, number> {
  const current = currentOnly(projects);
  const ownHost = `.${new URL(siteUrl).hostname}`;
  const figures = current.map((project) => {
    const m = project.metrics;
    if (!m) throw new Error(`${project.name} has no metrics; run scripts/metrics.mjs`);
    const live = project.links.live ? new URL(project.links.live).hostname : "";
    return {
      project,
      m,
      use: Math.log10(1 + m.stars * STAR_VALUE + m.forks * FORK_VALUE + m.downloads),
      work: Math.log10(1 + m.closedIssues + m.commits),
      available: [m.public, live.endsWith(ownHost), m.release].filter(Boolean).length,
    };
  });
  const topUse = Math.max(0, ...figures.map((f) => f.use));
  const topWork = Math.max(0, ...figures.map((f) => f.work));
  return new Map(
    figures.map(({ project, m, use, work, available }) => [
      project,
      Math.round(
        WEIGHT.use * share(use, topUse) +
          WEIGHT.availability * (available / AVAILABILITY_POINTS) +
          WEIGHT.work * share(work, topWork) +
          WEIGHT.recent * share(m.recentCommits, m.commits),
      ),
    ]),
  );
}

/** The current projects by score, highest first, ties broken by name (#43). */
export function rankedProjects<T extends Ranked>(projects: readonly T[], siteUrl: string): T[] {
  const scores = projectScores(projects, siteUrl);
  return [...scores.keys()].sort(
    (a, b) => scores.get(b)! - scores.get(a)! || a.name.localeCompare(b.name, "en"),
  );
}

/** The home page's projects: the six with the highest score (#43). */
export function homeProjects<T extends Ranked>(projects: readonly T[], siteUrl: string): T[] {
  return rankedProjects(projects, siteUrl).slice(0, HOME_COUNT);
}

/** "2024–2025", or "2023" when the work began and ended in one year. */
export function periodLabel(period: { from: number; to: number }): string {
  return period.from === period.to ? String(period.from) : `${period.from}–${period.to}`;
}

/** "2026-10" as "October 2026". UTC, so the month never shifts with the build machine's zone. */
export function monthYear(yearMonth: string, locale: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year!, month! - 1)));
}
