import { getCollection, getEntry } from "astro:content";

import type { Project } from "./projects";
import { currentOnly, homeProjects, rankedProjects } from "./status";

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

/** Every project that is not Earlier work, in the order written in db/projects.json. */
export async function getCurrentProjects(): Promise<Project[]> {
  return currentOnly(await getProjects());
}

/** The home grid: the six current projects with the highest score (#43). */
export async function getFeaturedProjects() {
  return homeProjects(await getProjects(), (await getSite()).url);
}

/** Some current projects in the order of the score over all of them, highest first (#43). */
export async function byScore(projects: Project[]): Promise<Project[]> {
  const slugs = new Set(projects.map((project) => project.slug));
  const ranked = rankedProjects(await getProjects(), (await getSite()).url);
  return ranked.filter((project) => slugs.has(project.slug));
}

/** The Earlier work list, in the order written in db/earlier.json (newest first). */
export async function getEarlier() {
  const entries = await getCollection("earlier");
  return entries.map((entry) => entry.data).sort((a, b) => a.order - b.order);
}

/** Newest first, then the order written in db/projects.json. */
export function byYear(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => b.year - a.year || a.order - b.order);
}
