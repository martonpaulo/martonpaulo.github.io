import type { Copy } from "./copy";
import { projectsPath } from "./projects";

export interface NavigationItem {
  href: string;
  label: string;
  current: boolean;
}

export const isHomePath = (path: string) => path === "/";

/** The three destinations of the pill navigation, with the current one marked. */
export function navigationItems(nav: Copy["nav"], path: string): NavigationItem[] {
  return [
    { href: projectsPath, label: nav.work, current: path.startsWith(projectsPath) },
    { href: "/about/", label: nav.about, current: path.startsWith("/about/") },
    { href: "#contact", label: nav.contact, current: false },
  ];
}
