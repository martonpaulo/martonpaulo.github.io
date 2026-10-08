// Whether a project still lives, and what follows from it for the lists.
// No runtime imports, so `node --test` loads this file directly.

interface HasStatus {
  status: "active" | "archived" | "discontinued";
}

export function isDiscontinued(project: HasStatus): boolean {
  return project.status === "discontinued";
}

/**
 * Discontinued projects after every other one. Both groups keep the order they
 * arrived in, so a list sorted by year stays sorted inside each group.
 */
export function discontinuedLast<T extends HasStatus>(projects: readonly T[]): T[] {
  return [
    ...projects.filter((project) => !isDiscontinued(project)),
    ...projects.filter(isDiscontinued),
  ];
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
