import { getCollection, getEntry } from "astro:content";

export async function getSite() {
  const entry = await getEntry("site", "site");
  if (!entry) throw new Error("db.json is missing the `site` object");
  return entry.data;
}

export async function getPerson() {
  const entry = await getEntry("person", "person");
  if (!entry) throw new Error("db.json is missing the `person` object");
  return entry.data;
}

export async function getLinks() {
  return (await getCollection("links")).sort((a, b) => a.data.order - b.data.order);
}

/** Newest first; within a year, the order written in db.json. */
export async function getProjects() {
  const entries = await getCollection("projects");
  return entries.map((entry) => entry.data).sort((a, b) => b.year - a.year || a.order - b.order);
}

export async function getFeaturedProjects() {
  return (await getProjects()).filter((project) => project.featured);
}

export type Project = Awaited<ReturnType<typeof getProjects>>[number];

export const kindLabels: Record<Project["kind"], string> = {
  web: "web app",
  macos: "macOS app",
  library: "library",
  game: "game",
  experiment: "experiment",
};

export const kindLabelsPlural: Record<Project["kind"], string> = {
  web: "web apps",
  macos: "macOS apps",
  library: "libraries",
  game: "games",
  experiment: "experiments",
};
