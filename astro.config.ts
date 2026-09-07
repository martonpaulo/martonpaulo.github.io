import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";

import db from "./db.json" with { type: "json" };

// Every live project gets a short redirect (/p/<slug>) that survives the
// project moving hosts: the target lives in db.json, not in a hard-coded list.
const projectRedirects = Object.fromEntries(
  db.projects
    .filter((project) => project.links.live)
    .map((project) => [`/p/${project.slug}`, project.links.live as string]),
);

export default defineConfig({
  site: db.site.url,
  trailingSlash: "always",
  redirects: projectRedirects,
  integrations: [sitemap({ filter: (page) => !page.includes("/p/") })],
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Newsreader",
      cssVariable: "--font-serif",
      weights: [400],
      styles: ["normal", "italic"],
      subsets: ["latin"],
      fallbacks: ["Georgia", "serif"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "IBM Plex Sans",
      cssVariable: "--font-sans",
      weights: [400],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["system-ui", "sans-serif"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "IBM Plex Mono",
      cssVariable: "--font-mono",
      weights: [400],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["ui-monospace", "Menlo", "monospace"],
    },
  ],
  // Page CSS is a few kilobytes; inlining it removes the one render-blocking request.
  build: { inlineStylesheets: "always" },
  devToolbar: { enabled: false },
});
