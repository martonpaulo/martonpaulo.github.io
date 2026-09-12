<div align="center">

<img src="design/social-card/social-card.jpg" width="100%" alt="Marton Paulo, senior full-stack developer and vibe coder: the share card, with every product's icon on a wall in perspective">

# Personal Website

Marton Paulo's personal site: a static portfolio of projects, skills and contact links, built with Astro from a few JSON files.

[![Validate](https://github.com/martonpaulo/martonpaulo.github.io/actions/workflows/validate.yml/badge.svg)](https://github.com/martonpaulo/martonpaulo.github.io/actions/workflows/validate.yml) [![Deploy](https://github.com/martonpaulo/martonpaulo.github.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/martonpaulo/martonpaulo.github.io/actions/workflows/deploy.yml)

[![Astro 7](https://img.shields.io/badge/Astro-7-bc52ee)](https://astro.build) [![TypeScript 6](https://img.shields.io/badge/TypeScript-6-3178c6)](https://www.typescriptlang.org/) [![Node 22.12](https://img.shields.io/badge/Node-22.12-5fa04e)](https://nodejs.org/)

</div>

This is the **personal site and portfolio** of Marton Paulo, senior full-stack developer: the
projects, the bio, the skills and the links, each with its own page. Every word a visitor reads
comes from **a few JSON files in `db/`**, validated against a schema at build time, so adding a
project is editing data rather than writing markup.

It is built with [Astro](https://astro.build) and published to GitHub Pages when a build input
changes on `main`. There is **no backend, no database and no cookie**; Astro's `ClientRouter` is the
only client-side JavaScript, and it exists so the background stays still while pages change. Share
images are rendered once per build with satori and resvg.

---

<br />

## 🌱 Quick Start

Requires **Node.js 22.12 or newer** (even majors only) and npm.

```bash
git clone https://github.com/martonpaulo/martonpaulo.github.io.git
cd martonpaulo.github.io
pnpm install --frozen-lockfile
pnpm dev
```

[http://localhost:4321](http://localhost:4321)

Content lives in `db/`: the daily routine is editing one JSON file there, then running `pnpm validate` before committing.

TypeScript stays on major 6 until `astro check` supports 7.

<br />

## 🛠 Commands

| Command             | What it does                                                                          |
| ------------------- | ------------------------------------------------------------------------------------- |
| `pnpm validate`     | Runs the full gate before a commit: `check`, `lint`, `test`, `build`, in that order.  |
| `pnpm dev`          | Starts the Astro dev server at `http://localhost:4321`.                               |
| `pnpm build`        | Builds the whole site, sitemap, redirects and share images into `dist/`.              |
| `pnpm preview`      | Serves the built `dist/` locally.                                                     |
| `pnpm check`        | Checks types, and every file in `db/` against its schema.                             |
| `pnpm lint`         | Runs ESLint, then Prettier in check mode.                                             |
| `pnpm format`       | Rewrites every file with Prettier.                                                    |
| `pnpm test`         | Runs Node's test runner over `tests/`, covering invariants the schema cannot express. |
| `pnpm share-ground` | Re-renders the share image's ground after a product or icon changes.                  |

---

<br />

## I want to…

| I want to…                                 | Do this                                                                                                                                                                       |
| :----------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add or edit a project, the bio, a link     | Edit `db/projects.json`, `db/person.json` or `db/links.json`; labels live in `db/copy.json`. The shape is enforced by `src/content.config.ts`; a wrong value fails the build. |
| Put a project on the home page             | Set its `featured` to `true` and give it an `image` and a `tile`. Three to nine fit.                                                                                          |
| Change the order of projects within a year | Reorder them in `db/projects.json`; the site keeps the file's order.                                                                                                          |
| Give a project a short link                | Every project with a `live` URL already answers at `/p/<slug>/`.                                                                                                              |
| Change a colour, font or spacing           | Read `docs/design.md`, then change the token in `src/styles/tokens.scss`.                                                                                                     |
| Run everything CI runs                     | `pnpm validate`                                                                                                                                                               |
| Check the share images                     | `pnpm build`, then look in `dist/og/`.                                                                                                                                        |

<br />

## How it is put together

| Where                      | What it owns                                                                                  |
| :------------------------- | :-------------------------------------------------------------------------------------------- |
| `db/`                      | Every word of content and interface copy, one JSON file per collection                        |
| `src/content.config.ts`    | The collections and schemas over `db/`                                                        |
| `src/lib/`                 | Typed readers and the logic pages call: projects, navigation, seo, copy                       |
| `src/layouts/Base.astro`   | The `<head>`: title, description, canonical, Open Graph, JSON-LD, fonts                       |
| `src/components/`          | One `.astro` (markup) beside one `.scss` (style) per component                                |
| `src/styles/`              | Tokens, element defaults, utilities, motion, the breakpoint mixin, page styles                |
| `src/pages/`               | index, projects, a page per project and per kind, about, 404                                  |
| `src/pages/og/site.png.ts` | The one share image, rendered with satori and resvg                                           |
| `src/assets/`              | Project artwork and the share image's ground                                                  |
| `docs/`                    | `product.md` (what the site is for and will never do) and `design.md` (what each token means) |

<br />

## Validation

| Command         | Checks                                                                                                         |
| :-------------- | :------------------------------------------------------------------------------------------------------------- |
| `pnpm check`    | Types, and every file in `db/` against its schema                                                              |
| `pnpm lint`     | ESLint and Prettier                                                                                            |
| `pnpm test`     | Invariants the schema cannot express: unique slugs, a link per project, a sensible number of featured projects |
| `pnpm build`    | The whole site, sitemap, redirects and share images into `dist/`                                               |
| `pnpm validate` | All of the above, in that order                                                                                |

`Validate` runs the cheap checks — `check`, `lint`, `test` — on every push and pull request,
because linting and formatting read files the site never serves. `Deploy` waits for `Validate` to
succeed on `main` and never repeats those checks; it builds, uploads the Pages artifact and
deploys, on every successful run. A monthly scheduled run goes straight to `Deploy`, because two
facts on the site age without a commit: the years worked in the bio, counted from `careerStart` in
`db/person.json`, and the year in the footer.

[CONTRIBUTING.md](CONTRIBUTING.md) has the rest: how to report a bug, and the branch and commit
conventions.

<br />

## Security and privacy

The site is static HTML and CSS. It sets no cookies, runs no analytics, loads fonts from its own
origin, and makes no request to a third party from the visitor's browser.

---

<br />

## Limitations

- Content is one JSON file by design. See `docs/product.md` for what the site will never do and
  why: no CMS, no translations, no blog, no forms.
- Share images render once at build time in the site's dark colour scheme.
- The custom domain is registered at Hostinger and its DNS is served by Cloudflare, both managed
  outside this repository. Because the apex resolves to Cloudflare rather than to GitHub, GitHub
  cannot issue its own certificate: Cloudflare terminates HTTPS and redirects `http://`, while the
  Pages metadata keeps `https_enforced: false` and an `http://` URL. That mismatch is expected.

<br />

## License and attribution

[MIT](LICENSE) © 2026 Marton Paulo.

Type set in [Gabarito](https://github.com/naipefoundry/gabarito) and
[Figtree](https://github.com/erikdkennedy/figtree), both under the SIL Open Font License and loaded
through Fontsource.

The visual direction is indebted to [Seán Halpin](https://www.seanhalpin.xyz).
