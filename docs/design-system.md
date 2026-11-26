# Design

What the site is meant to make a visitor feel, and how every visual decision follows from that.
Change this file first, then the tokens in `src/styles/tokens.scss`; a component never sets a
colour, font or measure of its own.

## Contents

- [What the site should signify](#what-the-site-should-signify)
- [The signs](#the-signs)
- [Motion](#motion)
- [Interaction states](#interaction-states)
- [What is deliberately absent](#what-is-deliberately-absent)
- [Tokens](#tokens)
- [Checks every change passes](#checks-every-change-passes)
- [Rules for changes](#rules-for-changes)

## What the site should signify

The visitor met one of the tools, or Marton himself, and wants to see what else he has made. The site should feel like a well-lit workshop at night: a dark blue-green room with a light on,
where each thing Marton made sits on its own bright shelf. Two qualities have to come through at once:

| Quality | What it says about Marton                                                           | Carried by                                                                                                          |
| :------ | :---------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| Craft   | Builds carefully: local-first, no telemetry, keyboard-navigable, exact spacing      | Real product screenshots on the tiles, generous whitespace, a strict rhythm of spacing, hover that answers the hand |
| Play    | Curious and warm: hitchhiking, five languages, free software made for the joy of it | Pastel tiles, a rounded bold display face, sparkles around the greeting, first-person copy                          |

The starting reference was [seanhalpin.xyz](https://www.seanhalpin.xyz): a dark green field, a
floating pill navigation and pastel product tiles. What is borrowed is the structure. The palette,
the faces, the ornament and every word are this site's own, and the owner's rule is explicit: the
result must not be mistaken for the reference.

## The signs

**A deep blue-green room.** `#172630`, a dark with a clear blue-green undertone, the way Apple's
dark surfaces are dark without being black. A neutral room lets the pastel tiles be the colour, instead
of competing with them. It is the only scheme: the site does not switch to light, because the
tiles are the light.

**White headings, one aqua accent.** Headings are a warm white (`--heading`), so hierarchy comes
from size and weight rather than colour. The accent, `#7fd0e6`, a light aqua between the room's
blue and its green, is spent only on what can be acted on or what names a thing: links, the
primary button, the mark, the eyebrows' brackets and list bullets.

**The bracket, kept small.** The site's signature is `[ ]`: the mark in the navigation and the
brackets around every label. Never around a title and never as a bullet; the owner tried both and
they read as decoration. Lists use a small accent dot.

**A still light.** Two blurred discs, one blue and one teal, sit at the top of every page. They
do not move: the owner tried a drifting light and preferred the room quiet.

**Tiles shaped like App Store stories.** The card model is Apple's "Today" card: a small caption,
a bold title and one line at the top, the artwork filling the bottom, a large continuous corner, a
faint resting shadow, and a whole-card grow of two and a half percent under the pointer with the
artwork growing with it, never on its own. A tile is painted with the gradient of its product's own
social card, copied as CSS by `pnpm card-gradients`, so the tile and the card read as one product.
The gradient is never lightened or darkened to suit the text: the text takes the ink that reads on
it instead, the dark `--tile-ink` on a light card and the light `--tile-ink-light` on a dark one,
each at AA or better. A project without a social card falls back to one of eight pastel tile colours,
on which the dark ink reads. A project without a screenshot shows its app
icon instead; the tile does not pretend.

**Real screenshots, anchored to the edge.** Every featured image is the product itself, captured
from the live app at two or three times pixel density. A screenshot is cut to the art box's own
16:10 ratio and stored square-cornered, so the browser never crops it and the whole file width
renders; the screenshot is inset on the left with its top-left corner rounded and runs flush to the
card's right and bottom edges, where the card's own corner finishes it (the card clips with
`clip-path`, because `overflow: hidden` alone lets a transformed child poke past a radius; the
clipping surface sits inside the link rather than on it, because the same clip would otherwise
erase the focus ring and the shadow the link paints outside its own shape). A panel with its own shape (WindowHop's switcher) is shown whole on the
tile, and an app without an interface to capture shows its icon. Nothing is a mock-up.
An app that has no interface to capture (a menu bar utility, a personal iPhone app) shows its icon.

**A rounded bold display face against a plain body.** Gabarito at 700 for headings and buttons,
with tight tracking so a sentence reads as one shape; Figtree at 400 for everything else. Exactly
two font files load, both free, from the site's own origin. No monospace: the previous site's
brackets survive only as the mark.

**The bracket mark.** Two brackets with an offset shadow, carried over from the previous site. It
lives in the navigation pill, the favicon and the share images, in the accent. The favicon has a
transparent background and a dark halo, so it reads on a white, black or coloured tab bar.

**A floating pill for navigation.** Three destinations and the mark, translucent over the page,
sticky at the top. It never grows a menu because there is nothing to hide in it.

**Earlier work has its own tab.** The home page and the project tabs show only current work. A
retired product, an older project or a course exercise is one row on the Earlier work tab, the last
chip of the filters, with its icon, its kind and the years it was worked on, and it links to its
frozen build in the archive. No badge marks it: the grouping says it. A retired
product keeps its page, which says when it stopped, why, and where to go instead
([#42](https://github.com/martonpaulo/martonpaulo.github.io/issues/42), replacing the badge of
[#26](https://github.com/martonpaulo/martonpaulo.github.io/issues/26)). Its rows are quieter than
the current list: the name in `--text-muted` and the icon faded to `--retired-opacity`, with full
colour back while the row is pointed at or holds focus; each stays a link like any other row
([#43](https://github.com/martonpaulo/martonpaulo.github.io/issues/43)).

**The tab row is three groups.** Everything, the whole list, comes first in the display face, bold
and without a fill, and a divider follows it; then one chip per platform; then a divider and
Earlier work. The current tab looks the same whichever it is. Every Projects hero reserves the room
of the tallest one, so the tab row never moves between tabs, and every page reserves the
scrollbar's room, so nothing moves sideways between a short page and a long one
([#43](https://github.com/martonpaulo/martonpaulo.github.io/issues/43)).

**Copy in the first person, plain and short.** The home page opens with the name and role as an
eyebrow and one claim as the heading: "Software made with care". Section headings are
nouns ("Work", "Lately", "Get in touch"), not greetings, and no heading ends in a full stop. No adjectives about passion; the
projects carry that.

## Motion

Two kinds of motion, each with one job. Arrival: the hero and the card grid rise into place on
load, each child a beat after the last (`.enter`); they rise without fading in, so the content is
there from the first paint. Response: a card grows by two and a half percent, artwork included, and its shadow deepens; it
presses to 98.5% on click. Every other control answers in colour and never moves
([Interaction states](#interaction-states)). Every curve is a long ease-out, never a bounce, so nothing overshoots or snaps. Pages change through the browser's own
cross-document view transition, with no script: the background paints the same on both pages, so
only the content changes, and it then arrives, so a page change never flashes. Browsers without
cross-document view transitions (Firefox today) change pages with a plain load. Under `prefers-reduced-motion` everything that moves stops; the arrival keeps a
short fade of opacity alone, because a fade is not motion and a hard cut between pages reads as a
flash.

## Interaction states

One system for every control ([#45](https://github.com/martonpaulo/martonpaulo.github.io/issues/45)).
Each look is a `--state-*` or `--focus-*` token in `src/styles/tokens.scss`, and each family's
state rules are one mixin in `src/styles/_states.scss`, which every component includes: a component
never writes a hover, press or current rule of its own. `tests/states.test.mjs` fails on a state
rule outside the tokens, and on a current, hover-fill or hover-ink rule outside `_states.scss`.
`pnpm state-check` sorts every control of every page into a family (a control no family takes, or a
current one whose family has no current state, fails), then renders each look of each family, and
every current control on every page, in each state and combination, in both colour-scheme
emulations. It fails when a hover does not show, keyboard focus draws no ring, a current control
changes its fill, border or ink under hover, focus or press, or a label falls under its contrast
(4.5:1 for text, 3:1 for an icon), measured against the pixels behind it
([#52](https://github.com/martonpaulo/martonpaulo.github.io/issues/52)).

| Family                                             | Hover                                              | Pressed               | Current                                                        |
| :------------------------------------------------- | :------------------------------------------------- | :-------------------- | :------------------------------------------------------------- |
| Primary button                                     | `--state-primary-hover-fill`, `--state-hover-ring` | `--state-press-shade` | none                                                           |
| Secondary button, pill, tab, nav item, icon button | `--state-hover-fill`, `--state-hover-ink`          | `--state-press-shade` | `--state-current-fill`, `--state-current-ink` (`aria-current`) |
| Text link                                          | `--state-hover-ink` and a full underline           | none                  | none                                                           |
| Quiet link, retired row                            | `--state-hover-text` (muted text comes up)         | none                  | none                                                           |
| Card                                               | `--state-lift`, `--state-lift-shadow`              | `--state-press`       | none                                                           |
| Image link                                         | `--state-lift` on the image                        | none                  | none                                                           |

- **Who moves.** Only cards and image links grow, by `--grow`, and press back by `--press`.
  Buttons, pills, tabs, navigation and text links never move: hover changes their colour, a press
  darkens them in place. The mark's shadow steps one hairline (`--state-nudge`), its one gesture.
- **Focus.** One ring, `--focus-ring` (three hairlines of `--focus`, white) at `--focus-ring-offset`,
  on every control and every background; the page is dark, so the ring keeps well over 3:1. It is
  never removed without a replacement.
- **Current wins.** The page or tab in view carries `aria-current` and the accent fill, which no
  hover uses, so current and hover never look alike. Current wins over hover, focus and press: the
  hover and press rules match only a control that is neither current nor disabled, so no rule order
  can repaint a current one. Pointing at, focusing or pressing a current pill only adds
  `--state-hover-ring` (and the press shade); its fill and ink stay
  ([#52](https://github.com/martonpaulo/martonpaulo.github.io/issues/52)).
- **Disabled.** `:disabled` or `aria-disabled="true"`: faded to `--state-disabled-opacity`,
  `cursor: not-allowed`, still announced, and every hover rule skips it. The site has no disabled
  control today; the rule is there for the first one.
- **Accessibility.** Text keeps 4.5:1 in every state and the ring 3:1; hover is never the only cue
  (the underline, the fill and `aria-current` say it too); under `prefers-reduced-motion` the
  transforms are `none` and every transition ends at once.
- **Speed.** A state changes only `color`, `background-color`, `border-color`, `box-shadow`,
  `transform` and `opacity` (and a link's underline), over `--state-duration` with
  `--state-ease`; nothing that triggers layout.

## What is deliberately absent

Preloaders, entrance animations on scroll, gradient blobs, glass cards, tech-icon walls, stat
counters, testimonials, custom cursors, a theme toggle, a hamburger menu. Each of these signifies a
template, and a template signifies that the owner did not decide.

## Tokens

The values live in `src/styles/tokens.scss` as CSS custom properties, so they are read at runtime
and can be inspected in the browser. Their meaning:

| Token                                                                                                | Role                                                                                                                 |
| :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| `--bg`, `--bg-glow`                                                                                  | The room and the light at the top of it                                                                              |
| `--surface`, `--surface-strong`, `--border`                                                          | Translucent layers for the pill, chips and buttons                                                                   |
| `--text`, `--text-muted`                                                                             | Body text at two levels of emphasis; both pass AA on `--bg`                                                          |
| `--heading`, `--primary`, `--primary-strong`                                                         | Warm white headings; aqua links and controls, and their hover                                                        |
| `--focus`                                                                                            | White keyboard-focus indicator, distinct from the aqua interactive accent                                            |
| `--tile-*`, `--tile-ink`, `--tile-ink-muted`, `--tile-ink-light*`                                    | The eight fallback pastel tiles, the dark ink for them and light cards, the light ink for dark cards                 |
| `--font-display`, `--font-body`                                                                      | The two voices                                                                                                       |
| `--text-*`                                                                                           | The type scale; the three largest steps are fluid                                                                    |
| `--space-1` … `--space-6`                                                                            | The only spacing scale: 0.25 rem doubling to 8 rem. Components do not invent values between steps                    |
| `--radius-*`, `--hairline`                                                                           | Corners and the one line weight                                                                                      |
| `--shadow-card`, `--shadow-card-raised`                                                              | A card at rest and the deeper lift it reaches under the pointer                                                      |
| `--shadow-panel`, `--shadow-relief`                                                                  | The panel edge and the icon drop                                                                                     |
| `--container`, `--container-wide`, `--width-subtitle`                                                | The column, the only width text gets, and the subtitle under a page title; the container widens on ultrawide screens |
| `--card-*`, `--touch-target`                                                                         | Tile geometry and the minimum size of anything tappable                                                              |
| `--duration`, `--ease`, `--ease-out`, `--grow`, `--press`, `--enter-*`, `--state-*`, `--focus-ring*` | Response timing, easing, transforms and entrance motion                                                              |

Breakpoints are the one thing that cannot be a custom property, so they live once in
`src/styles/_breakpoints.scss` as a Sass mixin: `tablet` at 48 rem, `desktop` at 64 rem,
`ultrawide` at 112 rem. Cards go from one column to two at `tablet` and to three at `ultrawide`;
three is the ceiling, because a wider row turns a shelf of objects into a table of rows.

### Published tokens

The owner's other sites take this look from the build, never from a copy edited by hand. Every
deploy publishes, built by `src/lib/design.ts`:

| Address                                                                | Content                                                                            |
| :--------------------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| `https://martonpaulo.com/design/tokens.css`                            | The `:root` custom properties compiled from `tokens.scss`, ultrawide rule included |
| `https://martonpaulo.com/design/fonts.css`                             | `@font-face` for the two voices, `font-display: swap`                              |
| `https://martonpaulo.com/design/fonts/figtree-latin-400-normal.woff2`  | Figtree 400, from `@fontsource/figtree`, beside `figtree-OFL.txt`                  |
| `https://martonpaulo.com/design/fonts/gabarito-latin-700-normal.woff2` | Gabarito 700, from `@fontsource/gabarito`, beside `gabarito-OFL.txt`               |
| `https://martonpaulo.com/design/manifest.json`                         | Each file's path, byte size and SHA-256, and the commit the build ran on           |

Only the two weights the site loads are published; a reader uses those two voices and synthesises
no other. A reader pins the manifest and checks drift on its side.

A token's name is now a contract. Adding a token is free; renaming or removing one is announced to
the sites that read these files before it ships, because their styles break silently otherwise.

## Checks every change passes

Drawn from WCAG 2.2, Apple's Human Interface Guidelines and the usual practice of restraint, and
verified with Lighthouse on every page before a push:

- Text contrast at least 4.5:1, large text and controls at least 3:1, on the room and on every
  tile. `--text-muted` and `--tile-ink-muted` are the floors.
- Every interactive element at least `--touch-target` (2.75 rem, 44 px) tall, with a visible
  focus ring in `--focus` that is never the accent.
- One aqua accent for links, controls, the mark and small ornaments; warm white headings and pastel
  tile surfaces preserve the existing visual roles.
- Text fills its column, with no reading measure of its own; only the subtitle under a page title
  (`.hero-summary`) takes `--width-subtitle`
  ([#44](https://github.com/martonpaulo/martonpaulo.github.io/issues/44)); headings in order, one `h1` per
  page, landmarks and a skip link on every page.
- Motion answers the pointer, stays under a second, uses ease-out, and disappears under
  `prefers-reduced-motion`, where only an opacity fade remains. Nothing animates on scroll. A
  machine with "Reduce motion" on sees no movement by design; check that setting before judging
  motion.
- Images are the product at two or three times pixel density, cut to the box that shows them, so
  nothing is upscaled or cropped by the browser.
- No layout shift: every image has intrinsic dimensions, fonts preload, and the page keeps
  Lighthouse at 100 in performance, accessibility, best practices and SEO.

## Rules for changes

- A new colour, font, radius, shadow or measure is a new token with a row in the table above, or it
  does not exist. A number typed into a component is a defect.
- A new visible string goes into `db/copy.json`, never into a component.
- Markup lives in the `.astro` file, style in the `.scss` file beside it, logic in `src/lib`. Class
  names are block__element--modifier, prefixed with the component's name, because component styles
  are global.
- A new component starts from the shared utilities (`.container`, `.stack-center`, `.actions`,
  `.dot-list`, `.lede`, `.hero-summary`, `.centered-text`, `.section`) before adding its own rules.
- Every interactive element is at least `--touch-target` tall, has a visible focus ring, and works
  without a pointer.
- The share image in `src/pages/og/site.png.ts` mirrors the tokens as constants; when a token
  changes, the constants change with it.
- Anything that would break one of the rules above, or adds a pattern this file does not describe,
  is a decision to raise with the owner before it is written.
