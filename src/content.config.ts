import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { z } from "astro/zod";

import { fixedShareImageIds } from "./lib/pages";

// The db/ folder is the only content source: one JSON file per collection.
// Each becomes a typed collection so a malformed entry fails the build.
const dbFile = (name: string) => `db/${name}.json`;

type Entry = Record<string, unknown>;

/** Array collections keep the author's order: the store sorts by id, so each entry records its position. */
const listFromDb = (name: string, idField = "id") =>
  file(dbFile(name), {
    parser: (text) =>
      JSON.parse(text).map((entry: Entry, order: number) => ({
        id: entry[idField],
        order,
        ...entry,
      })),
  });

/** A single object becomes a one-entry collection keyed by the file's name. */
const objectFromDb = (name: string) =>
  file(dbFile(name), { parser: (text) => ({ [name]: JSON.parse(text) }) });

export const projectKinds = [
  "web",
  "macos",
  "ios",
  "typeface",
  "library",
  "game",
  "experiment",
] as const;

export const tileColors = [
  "lilac",
  "mint",
  "salmon",
  "sky",
  "cream",
  "sage",
  "peach",
  "lavender",
] as const;

const site = defineCollection({
  loader: objectFromDb("site"),
  schema: z.object({
    url: z.url(),
    name: z.string(),
    title: z.string(),
    description: z.string().max(160),
    locale: z.string(),
    repository: z.url(),
    twitter: z.string().nullable(),
  }),
});

const person = defineCollection({
  loader: objectFromDb("person"),
  schema: z.object({
    name: z.string(),
    givenName: z.string(),
    role: z.string(),
    tagline: z.string().max(60),
    intro: z.string(),
    location: z.string(),
    /** The month the first job began, as YYYY-MM. `{years}` in the bio is counted from it at build time. */
    careerStart: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    bio: z.array(z.string()).min(1),
    now: z.array(z.string()),
    languages: z.array(z.object({ name: z.string(), level: z.string() })),
    stack: z.array(z.object({ group: z.string(), items: z.array(z.string()).min(1) })),
    interests: z.array(z.string()),
  }),
});

const kindLabel = z.object({ one: z.string(), many: z.string() });

/** Every visible string that is not a project's or a person's own content. `{placeholders}` are filled by src/lib/copy.ts. */
const copy = defineCollection({
  loader: objectFromDb("copy"),
  schema: z.object({
    nav: z.object({
      label: z.string(),
      home: z.string(),
      work: z.string(),
      about: z.string(),
      contact: z.string(),
      skip: z.string(),
    }),
    home: z.object({
      eyebrow: z.string(),
      greeting: z.string(),
      featuredHeading: z.string(),
      allWork: z.string(),
      nowHeading: z.string(),
      moreAbout: z.string(),
    }),
    projects: z.object({
      title: z.string(),
      lede: z.string(),
      description: z.string(),
      featuredHeading: z.string(),
      archiveHeading: z.string(),
      filterLabel: z.string(),
      filterAll: z.string(),
      kindTitle: z.string(),
      kindLede: z.string(),
      kindDescription: z.string(),
      kindFeaturedHeading: z.string(),
      kindArchiveHeading: z.string(),
    }),
    project: z.object({
      description: z.string(),
      /** Appended to the description when the project links its source. */
      descriptionSource: z.string(),
      builtWith: z.string(),
      year: z.string(),
      status: z.string(),
      maintained: z.string(),
      archived: z.string(),
      open: z.string(),
      source: z.string(),
      package: z.string(),
      siblingsLabel: z.string(),
      newer: z.string(),
      older: z.string(),
    }),
    about: z.object({
      title: z.string(),
      description: z.string(),
      biographyLabel: z.string(),
      nowHeading: z.string(),
      stackHeading: z.string(),
      languagesHeading: z.string(),
      interestsHeading: z.string(),
    }),
    contact: z.object({
      title: z.string(),
      lede: z.string(),
      colophon: z.string(),
      sourceLink: z.string(),
    }),
    notFound: z.object({
      title: z.string(),
      /** The tab and search title; the visible heading above keeps its own voice. */
      documentTitle: z.string(),
      lede: z.string(),
      description: z.string(),
      home: z.string(),
      work: z.string(),
      contact: z.string(),
    }),
    og: z.object({ workSubtitle: z.string() }),
    kinds: z.object({
      web: kindLabel,
      macos: kindLabel,
      ios: kindLabel,
      typeface: kindLabel,
      library: kindLabel,
      game: kindLabel,
      experiment: kindLabel,
    } satisfies Record<(typeof projectKinds)[number], typeof kindLabel>),
  }),
});

const links = defineCollection({
  loader: listFromDb("links"),
  schema: z.object({
    id: z.string(),
    order: z.number().int(),
    label: z.string(),
    url: z.url().or(z.string().startsWith("mailto:")),
    handle: z.string(),
    primary: z.boolean(),
  }),
});

const projects = defineCollection({
  loader: listFromDb("projects", "slug"),
  schema: ({ image }) =>
    z.object({
      slug: z
        .string()
        .regex(/^[a-z0-9-]+$/)
        .refine((slug) => !(fixedShareImageIds as readonly string[]).includes(slug), {
          message: `reserved for a fixed share image: ${fixedShareImageIds.join(", ")}`,
        }),
      order: z.number().int(),
      name: z.string(),
      tagline: z.string().max(90),
      description: z.string(),
      year: z.number().int().min(2015).max(2100),
      kind: z.enum(projectKinds),
      stack: z.array(z.string()).min(1),
      tags: z.array(z.string().regex(/^[a-z0-9-]+$/)),
      links: z.object({
        live: z.url().optional(),
        source: z.url().optional(),
        package: z.url().optional(),
      }),
      /** Shown when a project has no public link, so the absence reads as a decision. */
      note: z.string().optional(),
      featured: z.boolean(),
      status: z.enum(["active", "archived"]),
      tile: z.enum(tileColors).optional(),
      image: z
        .object({
          src: image(),
          alt: z.string(),
          /** cover: a 16:10 screenshot filling the box; object: a whole panel on the tile; contain: an app icon. */
          fit: z.enum(["cover", "object", "contain"]),
        })
        .optional(),
    }),
});

export const collections = { site, person, links, copy, projects };
