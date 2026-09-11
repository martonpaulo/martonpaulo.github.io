import type { CollectionEntry } from "astro:content";

import { fill } from "./copy";

type Person = CollectionEntry<"person">["data"];

/**
 * Whole years worked since `careerStart`, counted on the date of the build.
 * The site is static, so the number moves only when it is rebuilt: the deploy
 * workflow rebuilds on a monthly schedule for that reason.
 */
export function yearsWorked(person: Person, today = new Date()): number {
  const [year, month] = person.careerStart.split("-").map(Number) as [number, number];
  const months = (today.getUTCFullYear() - year) * 12 + (today.getUTCMonth() + 1 - month);
  return Math.floor(months / 12);
}

/** The bio with `{years}` filled in as a numeral ("6 years"), by the owner's preference. */
export function bioParagraphs(person: Person, today = new Date()): string[] {
  const years = yearsWorked(person, today);
  return person.bio.map((paragraph) => fill(paragraph, { years }));
}

/** The stack groups as label/value rows for a definition list. */
export function stackRows(person: Person) {
  return person.stack.map((group) => ({ term: group.group, value: group.items.join(", ") }));
}

/**
 * The languages as label/value rows: how well it is spoken, the CEFR band that
 * says the same thing in a scale anyone can compare, and the exam that
 * certifies it when one was sat.
 */
export function languageRows(person: Person) {
  return person.languages.map((language) => ({
    term: language.name,
    value: [language.level, language.cefr, language.certificate].filter(Boolean).join(" · "),
  }));
}
