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

/**
 * What separates several items in one label: a comma, so a label reads as words, never as
 * decoration (#61). The one owner of the separator; every label joins its items with it.
 */
export const LABEL_SEPARATOR = ", ";

/** "a, b, c": several items of one label, joined by {@link LABEL_SEPARATOR}. */
export function labelOf(items: readonly string[]): string {
  return items.join(LABEL_SEPARATOR);
}

/** One run of a text: plain, or a phrase to highlight. */
export interface Run {
  text: string;
  mark: boolean;
}

/**
 * `text` cut into runs, each phrase of `marks` a highlighted run of its own (#56). A phrase the text
 * does not hold throws, so a copy edit can never drop a highlight without the build saying so.
 */
export function markRuns(text: string, marks: string[]): Run[] {
  const found = marks
    .map((phrase) => {
      const at = text.indexOf(phrase);
      if (at < 0) throw new Error(`the highlighted phrase "${phrase}" is not in "${text}"`);
      return { at, end: at + phrase.length };
    })
    .sort((a, b) => a.at - b.at);
  const runs: Run[] = [];
  let from = 0;
  for (const { at, end } of found) {
    if (at < from) throw new Error(`two highlighted phrases overlap in "${text}"`);
    if (at > from) runs.push({ text: text.slice(from, at), mark: false });
    runs.push({ text: text.slice(at, end), mark: true });
    from = end;
  }
  if (from < text.length) runs.push({ text: text.slice(from), mark: false });
  return runs;
}
