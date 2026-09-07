import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";

import projects from "./db/projects.json" with { type: "json" };
import site from "./db/site.json" with { type: "json" };

// Every live project gets a short redirect (/p/<slug>) that survives the
// project moving hosts: the target lives in db/projects.json, not in a list here.
const projectRedirects = Object.fromEntries(
  projects
    .filter((project) => "live" in project.links)
    .map((project) => [`/p/${project.slug}`, project.links.live as string]),
);

export default defineConfig({
  site: site.url,
  trailingSlash: "always",
  redirects: projectRedirects,
  integrations: [sitemap({ filter: (page) => !page.includes("/p/") })],
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
