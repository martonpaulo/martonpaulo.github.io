import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";

import earlier from "./db/earlier.json" with { type: "json" };
import projects from "./db/projects.json" with { type: "json" };
import site from "./db/site.json" with { type: "json" };
import { projectKinds } from "./src/lib/kinds";

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

// Earlier work is not indexed (#42): its tab and the project pages it lists stay out of the
// sitemap, and so out of martonpaulo/domain's map, which lists martonpaulo.com from it.
const unlisted = new Set([
  "/projects/earlier/",
  ...earlier.flatMap((entry) => ("project" in entry ? [`/projects/${entry.project}/`] : [])),
]);

export default defineConfig({
  site: site.url,
  trailingSlash: "always",
  // The section was called "work" for its first days; keep those links alive.
  redirects: {
    "/work/": "/projects/",
    "/work/[slug]": "/projects/[slug]",
    // Two projects took their product's short name in September 2026, when
    // each moved to its own subdomain; the pages under the old slug stay alive.
    "/projects/country-badge-generator/": "/projects/country-badge/",
    "/projects/todo-print-editor/": "/projects/todo-print/",
    "/p/country-badge-generator/": "/p/country-badge/",
    "/p/todo-print-editor/": "/p/todo-print/",
    // AtlasTint took the one-word slug of its brand in September 2026.
    "/projects/atlas-tint/": "/projects/atlastint/",
    "/p/atlas-tint/": "/p/atlastint/",
    ...projectRedirects,
    ...kindRedirects,
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
