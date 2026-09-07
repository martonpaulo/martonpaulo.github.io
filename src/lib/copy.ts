import type { CollectionEntry } from "astro:content";

export type Copy = CollectionEntry<"copy">["data"];

/** Replaces `{name}` placeholders in a copy string with the given values. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
