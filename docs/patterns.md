# Patterns this project repeats

`AGENTS.md` sends an agent here before it edits `db/`, `src/` or `tests/`.

## Contents

- [The patterns](#the-patterns)
- [Earlier work](#earlier-work)
- [Interface rules](#interface-rules)
- [Toolchain](#toolchain)

## The patterns

These are the conventions the code already follows. A change that would break one, or establish a
new one, stops and asks the owner first, naming the existing pattern, the proposed one, and why the
existing one does not fit. Deviating is allowed; deviating silently is what produces two patterns.

- **The `db/` folder is the only content, including interface copy.** Every word a visitor reads
  comes from it: `site.json`, `person.json`, `links.json`, `projects.json`, and `copy.json` with
  every label, heading and template string. Placeholders like `{givenName}` are filled by `fill()` in `src/lib/copy.ts`.
  A string typed into a component is a defect. The one exception is `astro.config.ts`, which
  imports `db/projects.json` and `db/site.json` directly because the config runs before
  collections exist.
- **The schema is the validation.** A new field is added to the zod schema in
  `src/content.config.ts` before it is used, so a wrong value fails `astro check` and the build.
  Invariants zod cannot express (unique slugs, a link or a note per project, artwork on every
  featured project) are Node tests in `tests/`.
- **Order is authored, not sorted.** The loader records each entry's position in its file as
  `order`; readers in `src/lib/db.ts` sort by it, and `byYear()` is the only other ordering.
- **Markup, style and logic are separate files.** A component is `Name.astro` (markup and prop
  wiring only) beside `Name.scss` (its styles, global, so every class is prefixed with the
  component's name in block__element--modifier form). Page-level styles live in
  `src/styles/pages/`. Anything that computes lives in `src/lib/*.ts` (`projects.ts`,
  `navigation.ts`, `links.ts`, `images.ts`, `pages.ts`, `person.ts`, `seo.ts`, `copy.ts`), so a
  frontmatter block reads data and calls functions and does nothing else.
- **Visual decisions are tokens.** `docs/design-system.md` explains them; `src/styles/tokens.scss` holds
  them as CSS custom properties; components use only the variables. Sizes use `rem` on a doubling
  scale (`--space-1` … `--space-6`). Breakpoints are the one Sass mixin, in
  `src/styles/_breakpoints.scss`, so no width is repeated by hand. No utility framework, no inline
  colours, no magic numbers.
- **Shared utilities before new rules.** `.container`, `.stack-center`, `.actions`, `.dot-list`,
  `.lede`, `.prose`, `.section` and `.visually-hidden` in `src/styles/utilities.scss` cover the layouts
  every page repeats. A component reaches for them first.
- **Accessibility is part of the markup, not a pass afterwards.** Landmarks and skip link in the
  layout, `aria-current` on the active navigation and filter, one link per card with the project
  name alone as its required accessible name and decorative images with empty `alt`, headings in order with hidden
  ones where a section has no visible title, every control at least `--touch-target` tall, a
  visible focus ring in `--focus`, and every animation off under `prefers-reduced-motion`.
  A whole-card link is named by `aria-labelledby` pointing at its own heading, so the name is the
  visible one and the copy is not duplicated.
- **Responsive by measure, not by device.** Fluid type through `clamp()`, one card column on
  phones, two from `tablet`, three on `ultrawide` (three is the maximum by decision); the
  container widens on ultrawide instead of stretching the cards.
- **No script.** The site ships no client JavaScript. A page change is the browser's own
  cross-document view transition (`@view-transition` in `src/styles/motion.scss`), as described in
  [Design: Motion](design-system.md#motion). Astro's `<ClientRouter />` did this until 2026-09-13 and
  was removed because its module in `<head>` delayed the first paint on a throttled phone by
  176 ms (FCP 956 → 780 ms); a feature that needs a script must say what it does that HTML and CSS cannot.
- **SEO is owned by the layout.** `src/layouts/Base.astro` emits title, description, canonical,
  Open Graph, Twitter, JSON-LD (built in `src/lib/seo.ts`) and font preloads. A page passes
  `description` and optional extra JSON-LD; it never writes `<head>` tags. Every page shares one
  share image, `SHARE_IMAGE` (`/og/site.png`).
- **The share image is generated, never drawn by hand.** `src/pages/og/site.png.ts` renders the
  site's one card with satori and resvg, and every page links to it (owner decision, 2026-09-11:
  no per-page cards for now). It writes the copy over `src/assets/share/home-ground.png`, rendered
  by `pnpm share-ground` from `scripts/share-home/ground.html` (the page glow and every product's
  icon, `src/assets/share/<slug>.png`, on a wall in perspective), because satori cannot draw 3D
  transforms or blur. Re-render the ground when a product or its icon changes.
- **Project artwork is a real capture.** `src/assets/projects/<slug>.png` is a transparent PNG of
  the product's own interface cut into a rounded panel, or its app icon when there is no interface
  to capture. It is referenced from the project's `image` field in `db/projects.json` with an `alt` and a
  `fit`, and rendered through `<Image>` with the widths in `src/lib/images.ts`.
- **Static output, trailing slashes.** `trailingSlash: "always"` matches how GitHub Pages serves
  `directory` builds. Internal links end with `/`.
- **Redirects come from data.** `/p/<slug>` sends a visitor to a project's live URL; the list is
  derived from `db/projects.json` in `astro.config.ts` and excluded from the sitemap and `robots.txt`.
  Since 2026-09-09 each sibling project is served on its own subdomain
  (`https://<product>.martonpaulo.com/`, one GitHub Pages custom domain per repository), so `live`
  links point there; `martonpaulo.com/<repo>/` paths are gone and are not redirected.

## Earlier work

Retired products, older projects and course exercises are listed only on the Earlier work tab,
`/projects/earlier/`, never on the home page or the other tabs
([#42](https://github.com/martonpaulo/martonpaulo.github.io/issues/42)).

- **One list.** `db/earlier.json` is the only list, newest first. An entry is a Project of
  `db/projects.json` by `project` (name, tagline, kinds, icon and source come from there), or a
  frozen build with its own `name`, `tagline`, `kinds`, `source` and, inside a repository of
  exercises, `folder`. `slug` is its folder at `archive.martonpaulo.com`; `planned` marks one whose
  folder does not exist yet, which links to its project page until then. A Project is Earlier work
  exactly when its `status` is `discontinued`; `tests/earlier.test.mjs` checks both directions.
- **Agreement with the archive.** `pnpm archive-check` (`scripts/archive-check.mjs`) fails when a
  folder of `martonpaulo/portfolio-archive`'s `site/` has no entry, or an entry has no folder and is
  not planned. Validate runs it on every push and Live every day, since a folder can be added
  without a commit here.
- **Not indexed.** The tab and the project pages it lists carry `noindex` and are left out of the
  sitemap in `astro.config.ts`, so portfolio-sitemap, which lists martonpaulo.com from the sitemap,
  does not list them either. `scripts/earlier-build-check.mjs` checks the build for this, and that
  no page links the archive's root, which serves nothing.
- **The period is the years of real work.** `period` comes from the original repository's history,
  never from its last change: only the owner's own commits count (no bot, no upstream author of a
  fork), no merge, no commit that changes only files describing the repository (README, LICENSE,
  CNAME, `AGENTS.md`, `CLAUDE.md`, `.github/`, `docs/`), and no commit made only to fit the
  portfolio or the archive (its subject names the archive, the portfolio, martonpaulo.com or a
  discontinuation). For a repository of exercises, only the entry's folder counts.
  `node scripts/earlier-periods.mjs <clones-dir>` recomputes every period from clones of the
  repositories and fails on a difference. A repository that is not public (Smart Desk) is skipped
  there and its period is recorded by hand by the same rule; a project with no history takes the
  year the owner gives.

## Interface rules

- Read `docs/design-system.md` before any visual change. It says what the site is meant to signify
  and why each token exists; a change that cannot be explained in its terms does not belong. The
  visual reference is seanhalpin.xyz; the owner's taste is minimal, personal and never template-like.
- `--text-muted` is the lightest text allowed on `--bg`, and `--tile-ink-muted` on a tile; check
  contrast before adding a lighter one.
- Keep visible copy in `db/copy.json`.
- Keep expensive work out of the build's hot paths: share images are the slowest step and are
  generated once per page.
- Measure before claiming a performance problem. The target is 100 in every Lighthouse category on
  the home page and a project page.
- After a visual change, look at the affected page in the dev server in light and dark schemes and
  at a narrow width before committing, and in one browser of each engine family (Chromium, Gecko,
  WebKit); there is no browser automation.

## Toolchain

- Node 22.12 or newer, even versions only. TypeScript stays on major 6 until `astro check` supports
  TypeScript 7; do not bump it to make the lockfile look current.
- Styles are Sass (`.scss`) only for the breakpoint mixin and nesting; tokens stay CSS custom
  properties.
- Dependency updates are manual: run `pnpm outdated`, update, run `pnpm validate`, commit.
- `db/` is canonical data and the only durable state. `dist/`, `.astro/` and
  `node_modules/.astro/fonts` are reconstructible and never committed.
- Add a Node test in `tests/` for an invariant of `db/` the schema cannot express. Do not test
  framework behavior or mirror the schema.
- The fonts are loaded from Fontsource under the SIL Open Font License and are not vendored, so no
  notice file is needed; vendoring one would create that obligation.
