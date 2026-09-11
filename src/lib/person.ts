import type { CollectionEntry } from "astro:content";

import { fill } from "./copy";

type Person = CollectionEntry<"person">["data"];

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];

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

/** The bio with `{years}` filled in, spelled out the way the prose reads ("six years"). */
export function bioParagraphs(person: Person, today = new Date()): string[] {
  const years = yearsWorked(person, today);
  return person.bio.map((paragraph) =>
    fill(paragraph, { years: NUMBER_WORDS[years] ?? String(years) }),
  );
}

/** The stack groups as label/value rows for a definition list. */
export function stackRows(person: Person) {
  return person.stack.map((group) => ({ term: group.group, value: group.items.join(", ") }));
}

/** The languages as label/value rows for a definition list. */
export function languageRows(person: Person) {
  return person.languages.map((language) => ({ term: language.name, value: language.level }));
}
