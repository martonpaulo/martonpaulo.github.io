// The subjects a current project is filed under. No runtime imports, so `node --test` loads this
// file directly.

/**
 * What a current project is about, one each: the tabs of the Projects page, in the tab row's order
 * (#43). The platform it runs on is its kind, shown as a tag on its card and row. Every subject has
 * a current project, and every current project has exactly one subject (tests/db.test.mjs).
 */
export const projectSubjects = ["productivity", "design", "learning", "supernote", "ai"] as const;
