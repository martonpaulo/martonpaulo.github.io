import type { CollectionEntry } from "astro:content";

import type { Project } from "./projects";

type Site = CollectionEntry<"site">["data"];
type Person = CollectionEntry<"person">["data"];
type Link = CollectionEntry<"links">["data"];

export type JsonLdNode = Record<string, unknown>;

export function personNode(site: Site, person: Person, links: Link[]): JsonLdNode {
  const social = links.filter((link) => !link.url.startsWith("mailto:") && link.id !== "cv");
  const email = links.find((link) => link.url.startsWith("mailto:"))?.url;
  return {
    "@type": "Person",
    "@id": `${site.url}/#person`,
    name: person.name,
    givenName: person.givenName,
    jobTitle: person.role,
    url: site.url,
    email,
    sameAs: social.map((link) => link.url),
    address: { "@type": "PostalAddress", addressCountry: person.location },
    knowsLanguage: person.languages.map((language) => language.name),
  };
}

export function websiteNode(site: Site): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    url: site.url,
    name: site.title,
    description: site.description,
    inLanguage: site.locale,
    author: { "@id": `${site.url}/#person` },
  };
}

export function softwareNode(site: Site, project: Project): JsonLdNode {
  return {
    "@type": "SoftwareSourceCode",
    "@id": `${site.url}/projects/${project.slug}/#software`,
    name: project.name,
    description: project.description,
    url: `${site.url}/projects/${project.slug}/`,
    codeRepository: project.links.source,
    programmingLanguage: project.stack,
    dateCreated: String(project.year),
    author: { "@id": `${site.url}/#person` },
  };
}

export function jsonLdGraph(nodes: JsonLdNode[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes });
}
