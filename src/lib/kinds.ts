// The kinds a project can be. No runtime imports, so `node --test` loads this file directly.

/**
 * What a project is: the platform it runs on, never its genre, so a browser game is a web app
 * (#43). A kind is a tag on a project's card and row; the tabs are subjects (src/lib/subjects.ts),
 * and tests/db.test.mjs fails on a kind no current project has.
 */
export const projectKinds = [
  "web",
  "macos",
  "ios",
  "typeface",
  "library",
  "extension",
  "supernote-plugin",
  "supernote-app",
  "cli",
] as const;
