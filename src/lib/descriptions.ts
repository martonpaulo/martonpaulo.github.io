// The length rule for a page's meta description (#59). No runtime imports, so the schema, the
// pages, the build check and `node --test` share one rule.

/** Search engines cut a longer description and show a shorter one as too thin. */
const DESCRIPTION_MIN = 110;
const DESCRIPTION_MAX = 160;
export const descriptionLength = { min: DESCRIPTION_MIN, max: DESCRIPTION_MAX } as const;

/**
 * The first candidate that fits `descriptionLength.max`, longest wording first. When none fits it
 * returns the last, shortest one, so the build check names the page instead of a silent cut.
 */
export function firstThatFits(candidates: readonly [string, ...string[]]): string {
  return candidates.find((text) => text.length <= descriptionLength.max) ?? candidates.at(-1)!;
}
