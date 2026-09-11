import type { CollectionEntry } from "astro:content";

export type Copy = CollectionEntry<"copy">["data"];

/** Replaces `{name}` placeholders in a copy string with the given values. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Lowercases only the first letter, so "macOS apps" becomes "macOS apps" mid-sentence and "Web apps" becomes "web apps". */
export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** "a, b and c": the stack as a sentence reads it, in the site's British style (no serial comma). */
export function listOf(items: readonly string[]): string {
  return new Intl.ListFormat("en-GB", { style: "long", type: "conjunction" }).format(items);
}
