// The GitHub figures a project row shows beside its kinds and year (#71). No runtime imports, so
// `node --test` loads this file directly.

/** A project shows its star count from this many recorded stars (owner decision, #71). */
export const STARS_SHOWN_FROM = 10;
/** A project shows its download count from this many recorded downloads (owner decision, #71). */
export const DOWNLOADS_SHOWN_FROM = 100;

/** The recorded figures a row may show; forks are recorded too, and never shown. */
interface ShownMetrics {
  stars: number;
  downloads: number;
}

export interface ShownFigure {
  kind: "stars" | "downloads";
  count: number;
}

/**
 * The figures worth showing, stars first: only what passes its threshold, from the figures
 * scripts/metrics.mjs recorded. A project with no recorded figures shows none.
 */
export function shownFigures(metrics: ShownMetrics | undefined): ShownFigure[] {
  if (!metrics) return [];
  const figures: ShownFigure[] = [];
  if (metrics.stars >= STARS_SHOWN_FROM) figures.push({ kind: "stars", count: metrics.stars });
  if (metrics.downloads >= DOWNLOADS_SHOWN_FROM)
    figures.push({ kind: "downloads", count: metrics.downloads });
  return figures;
}

/** A count in the site's British English grouping: 1,234. */
export function countText(count: number): string {
  return count.toLocaleString("en-GB");
}
