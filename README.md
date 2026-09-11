# martonpaulo.com

![Validate and deploy](https://github.com/martonpaulo/martonpaulo.github.io/actions/workflows/deploy.yml/badge.svg)
![License](https://img.shields.io/github/license/martonpaulo/martonpaulo.github.io)

Marton Paulo's personal site, live at [martonpaulo.com](https://martonpaulo.com). A static
portfolio built with [Astro](https://astro.build) from a few JSON files, published to GitHub Pages
when a build input changes on `main`. No backend, no database, no cookies. Astro's `ClientRouter`
is the only client-side JavaScript.

<br />

## 🔁 The daily routine

> [!TIP]
> Edit a file in `db/`, run `npm run validate`, commit, push. The deploy workflow does the rest.

```bash
npm ci
npm run dev
```

<br />

## 🧭 I want to…

| I want to…                                 | Do this                                                                                                                                                                       |
| :----------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add or edit a project, the bio, a link     | Edit `db/projects.json`, `db/person.json` or `db/links.json`; labels live in `db/copy.json`. The shape is enforced by `src/content.config.ts`; a wrong value fails the build. |
| Put a project on the home page             | Set its `featured` to `true` and give it an `image` and a `tile`. Three to nine fit.                                                                                          |
| Change the order of projects within a year | Reorder them in `db/projects.json`; the site keeps the file's order.                                                                                                          |
| Give a project a short link                | Every project with a `live` URL already answers at `/p/<slug>/`.                                                                                                              |
| Change a colour, font or spacing           | Read `docs/design.md`, then change the token in `src/styles/tokens.scss`.                                                                                                     |
| See the site locally                       | `npm run dev`, then open `http://localhost:4321`.                                                                                                                             |
| Run everything CI runs                     | `npm run validate`                                                                                                                                                            |
| Check the share images                     | `npm run build`, then look in `dist/og/`.                                                                                                                                     |

<br />

## 🗂 How it is put together

```text
db/                        every word of content and interface copy, one JSON file per collection
src/content.config.ts      collections and schemas over db/
src/lib/                   typed readers and the logic pages call (projects, navigation, seo, copy)
src/layouts/Base.astro     <head>: title, description, canonical, Open Graph, JSON-LD, fonts
src/components/            one .astro (markup) beside one .scss (style) per component
src/styles/                tokens, element defaults, utilities, motion, the breakpoint mixin, page styles
src/pages/                 index, projects/, projects/[slug], projects/kind/[kind], about, 404
src/pages/og/[id].png.ts   one share image per page, rendered with satori and resvg
src/assets/projects/       the featured projects' artwork: real captures on rounded panels, or app icons
docs/product.md            what the site is for and what it will never do
docs/design.md             what the design means and why each token exists
```

Requirements: Node 22.12 or newer (even versions). TypeScript stays on major 6 until `astro check`
supports 7.

<br />

## ✅ Validation

| Command            | Checks                                                                                                         |
| :----------------- | :------------------------------------------------------------------------------------------------------------- |
| `npm run check`    | Types, and every file in `db/` against its schema                                                              |
| `npm run lint`     | ESLint and Prettier                                                                                            |
| `npm test`         | Invariants the schema cannot express: unique slugs, a link per project, a sensible number of featured projects |
| `npm run build`    | The whole site, sitemap, redirects and share images into `dist/`                                               |
| `npm run validate` | All of the above, in that order                                                                                |

CI runs the cheap checks on every push and pull request, because linting and formatting read
files the site never serves. The build, the artifact upload and the deploy are conditional: they
run only when the change touches something the build reads (`db/`, `src/`, `public/`, the Astro or
TypeScript configuration, the dependencies, or the workflow itself). A change to this README
is checked and not built. A monthly scheduled run always builds and deploys, because two facts on
the site age without a commit: the years worked in the bio, counted from `careerStart` in
`db/person.json`, and the year in the footer.

<br />

## 🔒 Security and privacy

The site is static HTML and CSS. It sets no cookies, runs no analytics, loads fonts from its own
origin, and makes no request to a third party from the visitor's browser. There are no secrets
and no environment variables; the build succeeds from a clean clone.

<br />

## 🚧 Limitations

- Content is one JSON file by design. See `docs/product.md` for what the site will never do and
  why: no CMS, no translations, no blog, no forms.
- Share images render once at build time in the site's dark colour scheme.
- The custom domain is registered at Hostinger and its DNS is served by Cloudflare, both managed
  outside this repository. Because the apex resolves to Cloudflare rather than to GitHub, GitHub
  cannot issue its own certificate: Cloudflare terminates HTTPS and redirects `http://`, while the
  Pages metadata keeps `https_enforced: false` and an `http://` URL. That mismatch is expected.

<br />

## 📄 License and credits

MIT, see [LICENSE](LICENSE). Type set in [Gabarito](https://github.com/naipefoundry/gabarito) and
[Figtree](https://github.com/erikdkennedy/figtree), both under the SIL Open Font License, loaded
through Fontsource. The visual direction is indebted to [Seán Halpin](https://www.seanhalpin.xyz).
