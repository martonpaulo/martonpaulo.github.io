# Design

What the site is meant to make a visitor feel, and how every visual decision follows from that.
Change this file first, then the tokens in `src/styles/global.css`; a component never sets a colour,
font or spacing of its own.

## What the site should signify

The visitor is a recruiter, hiring manager or developer with a few minutes, deciding whether to
reach out. The site has to signify two things at once, and the tension between them is the
identity:

| Pole   | What it says about Marton                                                                  | Carried by                                                                                                            |
| :----- | :----------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| Rigour | Builds carefully: local-first, no telemetry, keyboard-navigable, exact spacing             | Monospace metadata, the bracket grammar, hairline rules, a strict single column                                       |
| Warmth | Curious and personal: hitchhiking, five languages, small free tools made for the joy of it | An editorial serif for headings and asides, warm paper instead of white, first-person copy with a dry sense of humour |

The whole thing should read like a well-typeset notebook kept by an engineer: quiet, exact, human.
Nothing shouts, nothing is decorative, and every element can say why it is there.

## The signs

**The bracket mark.** Two brackets with a hard offset shadow, carried over from the previous site's
icon. Denotation: an array, a slot, the thing in code that holds a value. Connotation: a name held
carefully; a person whose work lives inside code. The offset shadow reads as printed or stamped,
which is to say made by hand. It is the only logo, and it is the site's grammar: years, section
labels, filters and status lines all sit in `[ brackets ]`, so the mark recurs as a system rather
than as a badge.

**Paper, not white.** `#f4f1ea` in light, `#13151e` in dark. Pure white signifies a product page or
a document template; warm paper signifies something written by a person. The dark scheme keeps the
navy cast of the old site's background so the two modes are the same place at night.

**One accent, ultramarine.** `#1f3bd6` descends from the old site's `#081a89`. Blue signifies
reliability; ultramarine specifically is a pigment rather than an interface colour, which keeps it
on the warm side of the line between craft and software. It appears only where attention belongs:
the mark, links on hover, the current filter, the year of a hovered project.

**Serif against mono.** Newsreader for headings and for the one italic aside a page is allowed;
IBM Plex Sans for reading; IBM Plex Mono for anything that is metadata rather than prose. The pair
is itself the message: a human voice next to machine precision. Newsreader was chosen over the
serifs common on developer sites because its optical sizes hold up at 4rem without turning
fashionable.

**Projects as sentences.** No cards, no thumbnails, no chips. A project is a name, one line that
says what it does, and a bracketed year. The reader scans a list the way they would scan a table of
contents. An image can be added per project later, but the list must remain readable without one.

**A single narrow column.** `40rem`. Sidebars and grids signify a product; a column signifies a
page someone wrote. Generous vertical space between sections says the author is not in a hurry.

**Copy in the first person, specific, slightly dry.** No "Hi 👋", no adjectives about passion. A
status line in brackets on the home page says where he is and what he is open to, because that is
the first thing the visitor wants to know and the last thing most sites say.

## What is deliberately absent

Entrance animations, preloaders, gradient blobs, glass cards, tech-icon walls, stat counters,
testimonials, custom cursors, a theme toggle. Each of these signifies a template, and a template
signifies that the owner did not decide. The only motion is a short cross-document fade between
pages, and the shadow of the mark sliding one pixel on hover.

## Tokens

The values live in `src/styles/global.css`. Their meaning:

| Token                                        | Role                                                                                                 |
| :------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| `--paper`, `--paper-2`                       | Page background and the one subtler surface                                                          |
| `--ink`, `--ink-2`, `--ink-3`                | Text at three levels of emphasis; `--ink-3` is the floor for small text and still passes AA on paper |
| `--rule`                                     | Hairlines only                                                                                       |
| `--accent`, `--accent-2`                     | Ultramarine and its deeper or lighter form for hover                                                 |
| `--font-serif`, `--font-sans`, `--font-mono` | The three voices above                                                                               |
| `--measure`                                  | The column width                                                                                     |
| `--space-*`                                  | The only spacing scale; components do not invent values between steps                                |
| `--text-*`                                   | The type scale; `--text-xl` and `--text-2xl` are fluid                                               |
| `--duration`, `--ease`                       | The single motion setting, disabled under reduced motion                                             |

## Rules for changes

- A new colour, font or spacing value is a new token with a row in the table above, or it does not
  exist.
- A new section label uses `.eyebrow` so it inherits the brackets. A new kind of metadata uses
  `--font-mono` and `--ink-3`.
- The share image in `src/pages/og/[id].png.ts` mirrors the light tokens; when a token changes, the
  constants there change with it.
- Anything that would break one of the rules above, or that adds a pattern this file does not
  describe, is a decision to raise with the owner before it is written.
