import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { z } from "astro/zod";

// db.json is the only content source. Each top-level key becomes a collection
// so pages read typed, validated data and a malformed entry fails the build.
const DB_PATH = "db.json";

// The store sorts entries by id, so each entry records its position in db.json
// and readers sort by `order` to keep the author's sequence.
const fromDb = (key: string) =>
  file(DB_PATH, {
    parser: (text) =>
      JSON.parse(text)[key].map((entry: Record<string, unknown>, order: number) => ({
        ...entry,
        order,
      })),
  });

const singletonFromDb = (key: string) =>
  file(DB_PATH, { parser: (text) => ({ [key]: JSON.parse(text)[key] }) });

const link = z.object({
  id: z.string(),
  order: z.number().int(),
  label: z.string(),
  url: z.url().or(z.string().startsWith("mailto:")),
  handle: z.string(),
  primary: z.boolean(),
});

export const projectKinds = ["web", "macos", "library", "game", "experiment"] as const;

const project = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
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
  featured: z.boolean(),
  status: z.enum(["active", "archived"]),
});

const site = defineCollection({
  loader: singletonFromDb("site"),
  schema: z.object({
    url: z.url(),
    name: z.string(),
    title: z.string(),
    description: z.string().max(200),
    locale: z.string(),
    repository: z.url(),
    twitter: z.string().nullable(),
  }),
});

const person = defineCollection({
  loader: singletonFromDb("person"),
  schema: z.object({
    name: z.string(),
    givenName: z.string(),
    role: z.string(),
    location: z.string(),
    availability: z.string(),
    bio: z.array(z.string()).min(1),
    now: z.array(z.string()),
    languages: z.array(z.object({ name: z.string(), level: z.string() })),
    stack: z.array(z.object({ group: z.string(), items: z.array(z.string()).min(1) })),
    interests: z.array(z.string()),
  }),
});

const links = defineCollection({ loader: fromDb("links"), schema: link });

const projects = defineCollection({
  // The loader keys entries by `id`; projects carry a `slug`, so map it.
  loader: file(DB_PATH, {
    parser: (text) =>
      JSON.parse(text).projects.map((entry: { slug: string }, order: number) => ({
        id: entry.slug,
        order,
        ...entry,
      })),
  }),
  schema: project,
});

export const collections = { site, person, links, projects };
