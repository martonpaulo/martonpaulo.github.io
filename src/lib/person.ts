import type { CollectionEntry } from "astro:content";

type Person = CollectionEntry<"person">["data"];

/** The stack groups as label/value rows for a definition list. */
export function stackRows(person: Person) {
  return person.stack.map((group) => ({ term: group.group, value: group.items.join(", ") }));
}

/** The languages as label/value rows for a definition list. */
export function languageRows(person: Person) {
  return person.languages.map((language) => ({ term: language.name, value: language.level }));
}
