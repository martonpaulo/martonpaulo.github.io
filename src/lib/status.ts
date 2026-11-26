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

interface Ranked extends HasStatus {
  name: string;
  stars?: number | undefined;
}

/**
 * The home page's projects: the current ones with the most GitHub stars, ties broken by name,
 * so the same data always gives the same six in the same order (#43). The stars are recorded
 * in db/projects.json by scripts/stars.mjs, never fetched by the build.
 */
export function homeProjects<T extends Ranked>(projects: readonly T[]): T[] {
  return currentOnly(projects)
    .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0) || a.name.localeCompare(b.name, "en"))
    .slice(0, HOME_COUNT);
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
