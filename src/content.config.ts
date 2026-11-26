import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { z } from "astro/zod";

import { projectKinds } from "./lib/kinds";

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

export { projectKinds };

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
    /** The noindex archive of frozen builds (martonpaulo/archive); an Earlier work entry lives at <archive><slug>/. */
    archive: z.url().endsWith("/"),
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
    languages: z.array(
      z.object({
        name: z.string(),
        level: z.string(),
        // The Common European Framework band, and the exam that certifies it when one was sat.
        cefr: z.string().regex(/^[ABC][12]$/),
        certificate: z.string().optional(),
      }),
    ),
    stack: z.array(z.object({ group: z.string(), items: z.array(z.string()).min(1) })),
    interests: z.array(z.string()),
  }),
});

/** `sentence`: the plural inside a sentence, for a label that keeps its capital ("Supernote plugins"). */
const kindLabel = z.object({ one: z.string(), many: z.string(), sentence: z.string().optional() });

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
      /** Read after a link that opens in a new tab, beside its visible arrow. */
      newTab: z.string(),
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
      /** Under the one heading every Projects tab shares (#54). */
      lede: z.string(),
      /** Each tab's own sentence, under the tab row (#54). */
      note: z.string(),
      description: z.string(),
      listHeading: z.string(),
      filterLabel: z.string(),
      filterAll: z.string(),
      kindNote: z.string(),
      kindDescription: z.string(),
      kindListHeading: z.string(),
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
      /** The Status row's value on a discontinued project's page. */
      discontinued: z.string(),
      discontinuedOn: z.string(),
      alternative: z.string(),
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
    /** The Earlier work tab: retired, old and study projects, dated by when they were built (#42). */
    earlier: z.object({
      tab: z.string(),
      title: z.string(),
      /** The tab's own sentence, under the tab row (#54). */
      note: z.string(),
      description: z.string(),
      listHeading: z.string(),
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
    kinds: z.object({
      web: kindLabel,
      macos: kindLabel,
      ios: kindLabel,
      typeface: kindLabel,
      library: kindLabel,
      extension: kindLabel,
      "supernote-plugin": kindLabel,
      "supernote-app": kindLabel,
      cli: kindLabel,
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

const year = z.number().int().min(2015).max(2100);
/** One line under a name in a list or on a card. */
const tagline = z.string().max(90);

const projects = defineCollection({
  loader: listFromDb("projects", "slug"),
  schema: ({ image }) =>
    z.object({
      slug: z.string().regex(/^[a-z0-9-]+$/),
      order: z.number().int(),
      name: z.string(),
      tagline,
      description: z.string(),
      year,
      kinds: z.array(z.enum(projectKinds)).min(1),
      // The alt text of the product's own social card, copied from the og:image:alt
      // the product serves, so the two never say different things.
      cardAlt: z.string().optional(),
      // The background of the product's own social card, copied as CSS so the tile
      // and the card read as one product, and the ink its text takes on it.
      // Generated by scripts/card-art/gradients.mjs.
      gradient: z.string().optional(),
      ink: z.enum(["dark", "light"]).optional(),
      stack: z.array(z.string()).min(1),
      tags: z.array(z.string().regex(/^[a-z0-9-]+$/)),
      links: z.object({
        live: z.url().optional(),
        source: z.url().optional(),
        package: z.url().optional(),
      }),
      /** Shown when a project has no public link, so the absence reads as a decision. */
      note: z.string().optional(),
      /** The repository as owner/name; scripts/stars.mjs reads its stars from GitHub. Never rendered. */
      repo: z
        .string()
        .regex(/^[\w.-]+\/[\w.-]+$/)
        .optional(),
      /** A file of the repository listing its tools; scripts/kinds.mjs writes `kinds` from it. */
      kindsFrom: z.string().optional(),
      /** GitHub stars, recorded by scripts/stars.mjs; the home page shows the six with the most (#43). */
      stars: z.number().int().nonnegative().optional(),
      // archived: it still runs, unmaintained. discontinued: the product stopped, and
      // the three fields below say when, why and where to go instead. They are set
      // exactly when a project is discontinued, which tests/db.test.mjs checks.
      status: z.enum(["active", "archived", "discontinued"]),
      /** The month it stopped, as YYYY-MM. */
      discontinuedOn: z
        .string()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
        .optional(),
      /** One short sentence, shown after "Discontinued in <Month YYYY>." */
      discontinuedReason: z.string().optional(),
      /** Where to go instead, when a public alternative exists. */
      alternative: z.url().optional(),
      tile: z.enum(tileColors).optional(),
      image: z
        .object({
          src: image(),
          alt: z.string(),
          /** cover: a 16:10 screenshot filling the box; object: a whole panel on the tile; contain: an app icon;
           * full: an opaque field painted under the whole tile, text included, for a product whose card is one field. */
          fit: z.enum(["cover", "object", "contain", "full"]),
        })
        .optional(),
    }),
});

/**
 * The one list of Earlier work, newest first (#42). An entry is either a Project of
 * db/projects.json, by `project`, which then gives the name, tagline, kinds and source, or a
 * frozen build of its own, which carries them. `slug` is its folder at archive.martonpaulo.com;
 * `planned` marks one whose folder does not exist yet. `period` is the years of real work, by the
 * rule in docs/patterns.md, "Earlier work"; scripts/earlier-periods.mjs recomputes it.
 */
const earlier = defineCollection({
  loader: listFromDb("earlier", "slug"),
  schema: z
    .object({
      slug: z.string().regex(/^[a-z0-9-]+$/),
      order: z.number().int(),
      project: z.string().optional(),
      planned: z.literal(true).optional(),
      name: z.string().optional(),
      tagline: tagline.optional(),
      kinds: z.array(z.enum(projectKinds)).min(1).optional(),
      source: z.url().optional(),
      /** The project's folder inside a repository of several exercises. */
      folder: z.string().optional(),
      period: z.object({ from: year, to: year }).refine((p) => p.from <= p.to, "from after to"),
    })
    .refine(
      (entry) =>
        entry.project
          ? [entry.name, entry.tagline, entry.kinds, entry.source].every((v) => v === undefined)
          : [entry.name, entry.tagline, entry.kinds, entry.source].every((v) => v !== undefined),
      "an entry names a project, or carries its own name, tagline, kinds and source, never both",
    ),
});

export const collections = { site, person, links, copy, projects, earlier };
