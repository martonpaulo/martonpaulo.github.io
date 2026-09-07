import type { Copy } from "./copy";

export interface NavigationItem {
  href: string;
  label: string;
  current: boolean;
}

export const isHomePath = (path: string) => path === "/";

/** The three destinations of the pill navigation, with the current one marked. */
export function navigationItems(nav: Copy["nav"], path: string): NavigationItem[] {
  return [
    { href: "/work/", label: nav.work, current: path.startsWith("/work/") },
    { href: "/about/", label: nav.about, current: path.startsWith("/about/") },
    { href: "#contact", label: nav.contact, current: false },
  ];
}
