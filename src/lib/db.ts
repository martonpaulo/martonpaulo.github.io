import { getCollection, getEntry } from "astro:content";

import type { Project } from "./projects";

const missing = (name: string) => new Error(`db/${name}.json is missing or empty`);

export async function getSite() {
  const entry = await getEntry("site", "site");
  if (!entry) throw missing("site");
  return entry.data;
}

export async function getPerson() {
  const entry = await getEntry("person", "person");
  if (!entry) throw missing("person");
  return entry.data;
}

export async function getCopy() {
  const entry = await getEntry("copy", "copy");
  if (!entry) throw missing("copy");
  return entry.data;
}

export async function getLinks() {
  const entries = await getCollection("links");
  return entries.map((entry) => entry.data).sort((a, b) => a.order - b.order);
}

/** In the order written in db/projects.json. */
export async function getProjects(): Promise<Project[]> {
  const entries = await getCollection("projects");
  return entries.map((entry) => entry.data).sort((a, b) => a.order - b.order);
}

export async function getFeaturedProjects() {
  return (await getProjects()).filter((project) => project.featured);
}

/** Newest first, then the order written in db/projects.json. */
export function byYear(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => b.year - a.year || a.order - b.order);
}
