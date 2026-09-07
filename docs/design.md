# Design

What the site is meant to make a visitor feel, and how every visual decision follows from that.
Change this file first, then the tokens in `src/styles/tokens.scss`; a component never sets a
colour, font or measure of its own.

## What the site should signify

The visitor is a recruiter, hiring manager or developer with a few minutes, deciding whether to
reach out. The site should feel like a well-lit workshop at night: a deep green room with a lamp on,
where each thing Marton made sits on its own bright shelf. Two qualities have to come through at once:

| Quality | What it says about Marton                                                              | Carried by                                                                                                          |
| :------ | :------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| Craft   | Builds carefully: local-first, no telemetry, keyboard-navigable, exact spacing         | Real product screenshots on the tiles, generous whitespace, a strict rhythm of spacing, hover that answers the hand |
| Play    | Curious and warm: hitchhiking, five languages, small free tools made for the joy of it | Pastel tiles, a rounded bold display face, sparkles around the greeting, first-person copy                          |

The starting reference was [seanhalpin.xyz](https://www.seanhalpin.xyz): a dark green field, a
floating pill navigation and pastel product tiles. What is borrowed is the structure. The palette,
the faces, the ornament and every word are this site's own, and the owner's rule is explicit: the
result must not be mistaken for the reference.

## The signs

**Deep green, not black.** `#1f302b`, a green with a little blue in it. Black signifies a
developer terminal; green signifies a room somebody chose. It is the only scheme: the site does
not switch to light, because the tiles are the light.

**A lamp, not a highlighter.** The accent is `#f2cf72`, the yellow of a warm bulb, and it is the
colour of every heading and every link. It appears on nothing decorative, so when it appears it is
Marton speaking. Body text is a neutral off-white so the yellow stays the only warm note.

**Light that moves.** Two blurred discs, one green and one warm, drift slowly behind every page on
a forty-second cycle. They are the room's lamp and its shadow; they never touch the content and
they stop under reduced motion.

**Pastel tiles for the work.** Eight tile colours, one per featured project, chosen so the
project's own screenshot reads on it: lilac under Tabelo's dark editor, cream under WindowHop's
dark switcher, sky under Moon Uniform's cream specimen. The tile's dark ink (`--tile-ink`) reads on
all of them at AA or better. A project without a screenshot shows its app icon instead; the tile
does not pretend.

**Real screenshots, framed.** Every featured image is the product itself, captured from the live
app and cut into a rounded panel that runs off the bottom-right of its tile. Nothing is a mock-up.
An app that has no interface to capture (a menu bar utility, a personal iPhone app) shows its icon.

**A rounded bold display face against a plain body.** Gabarito at 700 for headings and buttons,
with tight tracking so a sentence reads as one shape; Figtree at 400 for everything else. Exactly
two font files load, both free, from the site's own origin. No monospace: the previous site's
brackets survive only as the mark.

**The bracket mark.** Two brackets with an offset shadow, carried over from the previous site. It
lives in the navigation pill, the favicon and the share images, in the accent on green.

**A floating pill for navigation.** Three destinations and the mark, translucent over the page,
sticky at the top. It never grows a menu because there is nothing to hide in it.

**Copy in the first person, plain and short.** The home page opens with the name and role as an
eyebrow and one claim as the heading: "Small software, made with care." Section headings are
nouns ("Work", "Lately", "Get in touch"), not greetings. No adjectives about passion; the
projects carry that.

## Motion

Three kinds of motion, each with one job. Arrival: the hero and the card grid rise into place on
load, each child a beat after the last (`.enter`). Ambience: the two lights behind the page drift
on a slow loop. Response: a tile lifts a quarter rem and gains a shadow on hover while its artwork
slides half a rem down with a slight bounce; a button lifts an eighth. Pages cross-fade through the
browser's own view transitions. Under `prefers-reduced-motion` all of it stops, and the site is
exactly as usable.

## What is deliberately absent

Preloaders, entrance animations on scroll, gradient blobs, glass cards, tech-icon walls, stat
counters, testimonials, custom cursors, a theme toggle, a hamburger menu. Each of these signifies a
template, and a template signifies that the owner did not decide.

## Tokens

The values live in `src/styles/tokens.scss` as CSS custom properties, so they are read at runtime
and can be inspected in the browser. Their meaning:

| Token                                                                               | Role                                                                                              |
| :---------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------ |
| `--bg`, `--bg-glow`                                                                 | The room and the light at the top of it                                                           |
| `--surface`, `--surface-strong`, `--border`                                         | Translucent layers for the pill, chips and buttons                                                |
| `--text`, `--text-muted`                                                            | Body text at two levels of emphasis; both pass AA on `--bg`                                       |
| `--primary`, `--primary-strong`                                                     | Mint for headings and links, and its hover                                                        |
| `--focus`                                                                           | The one warm colour, reserved for keyboard focus so it is never mistaken for decoration           |
| `--tile-*`, `--tile-ink`, `--tile-ink-muted`                                        | The eight pastel tiles and the ink that reads on all of them                                      |
| `--font-display`, `--font-body`                                                     | The two voices                                                                                    |
| `--text-*`                                                                          | The type scale; the three largest steps are fluid                                                 |
| `--space-1` … `--space-6`                                                           | The only spacing scale: 0.25 rem doubling to 8 rem. Components do not invent values between steps |
| `--radius-*`, `--hairline`                                                          | Corners and the one line weight                                                                   |
| `--shadow-*`                                                                        | The card lift, the panel edge, the icon drop                                                      |
| `--container`, `--container-wide`, `--measure`, `--measure-wide`, `--measure-title` | Column and reading widths; the container widens on ultrawide screens                              |
| `--card-*`, `--touch-target`                                                        | Tile geometry and the minimum size of anything tappable                                           |
| `--duration-*`, `--ease`, `--ease-bounce`, `--lift`                                 | The motion vocabulary                                                                             |

Breakpoints are the one thing that cannot be a custom property, so they live once in
`src/styles/_breakpoints.scss` as a Sass mixin: `tablet` at 48 rem, `desktop` at 64 rem,
`ultrawide` at 112 rem. Cards go from one column to two at `tablet` and to four at `ultrawide`.

## Rules for changes

- A new colour, font, radius, shadow or measure is a new token with a row in the table above, or it
  does not exist. A number typed into a component is a defect.
- A new visible string goes into `db/copy.json`, never into a component.
- Markup lives in the `.astro` file, style in the `.scss` file beside it, logic in `src/lib`. Class
  names are block__element--modifier, prefixed with the component's name, because component styles
  are global.
- A new component starts from the shared utilities (`.container`, `.stack-center`, `.actions`,
  `.lede`, `.prose`, `.section`) before adding its own rules.
- Every interactive element is at least `--touch-target` tall, has a visible focus ring, and works
  without a pointer.
- The share image in `src/pages/og/[id].png.ts` mirrors the tokens as constants; when a token
  changes, the constants change with it.
- Anything that would break one of the rules above, or adds a pattern this file does not describe,
  is a decision to raise with the owner before it is written.
