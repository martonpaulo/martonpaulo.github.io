import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";

import earlier from "./db/earlier.json" with { type: "json" };
import projects from "./db/projects.json" with { type: "json" };
import site from "./db/site.json" with { type: "json" };
import { projectKinds } from "./src/lib/kinds";
import { mergedSubjects } from "./src/lib/subjects";
import { oldPageTarget } from "./src/lib/targets";

// Every live project gets a short redirect (/p/<slug>) that survives the
// project moving hosts: the target lives in db/projects.json, not in a list here.
const projectRedirects = Object.fromEntries(
  projects
    .filter((project) => "live" in project.links)
    .map((project) => [`/p/${project.slug}`, project.links.live as string]),
);

// The tabs were platforms until the owner grouped them by subject (#43); a platform's old tab
// leads to the whole list, where every project names its platforms.
const kindRedirects = Object.fromEntries(
  projectKinds.flatMap((kind) => [
    [`/projects/kind/${kind}/`, "/projects/"],
    [`/work/kind/${kind}/`, "/projects/"],
  ]),
);

// Supernote and AI each held one project until the owner folded them into Productivity (#69);
// their old tabs lead there.
const mergedSubjectRedirects = Object.fromEntries(
  mergedSubjects.map((subject) => [
    `/projects/subject/${subject}/`,
    "/projects/subject/productivity/",
  ]),
);

// Project pages lived at /projects/<slug>/ (and /work/<slug>/ before that) until #57. Each old URL
// now leads where the project does: its own site, its page at /<slug>/, or its frozen build. Two
// projects and AtlasTint took shorter slugs in September 2026; their oldest URLs lead there too.
const EARLIER_PATH = "/projects/earlier/";
const RENAMED: Record<string, string> = {
  "country-badge-generator": "country-badge",
  "todo-print-editor": "todo-print",
  "atlas-tint": "atlastint",
};
const targetOf = (slug: string) => {
  const project = projects.find((candidate) => candidate.slug === (RENAMED[slug] ?? slug));
  if (!project) throw new Error(`astro.config.ts: no project ${slug}`);
  return oldPageTarget(project, earlier, site.archive, EARLIER_PATH);
};
const oldPageRedirects = Object.fromEntries(
  [...projects.map((project) => project.slug), ...Object.keys(RENAMED)].flatMap((slug) => [
    [`/projects/${slug}/`, targetOf(slug)],
    [`/work/${slug}/`, targetOf(slug)],
  ]),
);

// Earlier work is not indexed (#42): its tab stays out of the sitemap, and so out of
// martonpaulo/domain's map, which lists martonpaulo.com from it.
const unlisted = new Set([EARLIER_PATH]);

export default defineConfig({
  site: site.url,
  trailingSlash: "always",
  // The section was called "work" for its first days; keep those links alive.
  redirects: {
    "/work/": "/projects/",
    ...oldPageRedirects,
    "/p/country-badge-generator/": "/p/country-badge/",
    "/p/todo-print-editor/": "/p/todo-print/",
    "/p/atlas-tint/": "/p/atlastint/",
    ...projectRedirects,
    ...kindRedirects,
    ...mergedSubjectRedirects,
  },
  // /p/ is redirects; /design/ is files for other sites, not pages.
  integrations: [
    sitemap({
      // By the path's start, so a page such as /projects/subject/design/ stays listed (#43).
      filter: (page) => {
        const path = new URL(page).pathname;
        return !path.startsWith("/p/") && !path.startsWith("/design/") && !unlisted.has(path);
      },
    }),
  ],
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Gabarito",
      cssVariable: "--font-display",
      weights: [700],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["Avenir Next", "Segoe UI", "system-ui", "sans-serif"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "Figtree",
      cssVariable: "--font-body",
      weights: [400],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["Avenir Next", "Segoe UI", "system-ui", "sans-serif"],
    },
  ],
  // Page CSS is a few kilobytes; inlining it removes the one render-blocking request.
  build: { inlineStylesheets: "always" },
  devToolbar: { enabled: false },
});
