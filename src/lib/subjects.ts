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
