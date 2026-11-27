// The subjects a current project is filed under. No runtime imports, so `node --test` loads this
// file directly.

/**
 * What a current project is about, one each: the tabs of the Projects page, in the tab row's order
 * (#43). The platform it runs on is its kind, shown as a tag on its card and row. Every subject has
 * a current project, and every current project has exactly one subject (tests/db.test.mjs).
 */
export const projectSubjects = ["productivity", "design", "learning"] as const;

/**
 * Subjects the owner folded into Productivity (#69): each one's old tab leads to Productivity's,
 * so a shared link keeps working.
 */
export const mergedSubjects = ["supernote", "ai"] as const;

/** The subject every merged subject's old tab leads to (#69). */
export const mergedInto: (typeof projectSubjects)[number] = "productivity";

/**
 * Paths under /projects/ that a subject cannot take: the Earlier work tab and the folders of the
 * old addresses (tests/earlier.test.mjs, #70).
 */
export const reservedProjectPaths = ["earlier", "kind", "subject"] as const;

/** A subject's tab, /projects/<subject>/: the one owner of the address's shape (#70). */
export function subjectPath(subject: (typeof projectSubjects)[number]): string {
  return `/projects/${subject}/`;
}

/** Where a subject's tab lived until #70; each such address now leads to its tab. */
export function oldSubjectPath(subject: string): string {
  return `/projects/subject/${subject}/`;
}
