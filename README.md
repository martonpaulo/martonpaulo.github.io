# martonpaulo.com

![Validate and deploy](https://github.com/martonpaulo/martonpaulo.github.io/actions/workflows/deploy.yml/badge.svg)
![License](https://img.shields.io/github/license/martonpaulo/martonpaulo.github.io)

Marton Paulo's personal site, live at [www.martonpaulo.com](https://www.martonpaulo.com). A static
portfolio built with [Astro](https://astro.build) from a single `db.json`, published to GitHub Pages
on every push to `main`. No backend, no database, no cookies, no client-side JavaScript.

<br />

## 🔁 The daily routine

> [!TIP]
> Edit `db.json`, run `npm run validate`, commit, push. The deploy workflow does the rest.

```bash
npm ci
npm run dev
```

<br />

## 🧭 I want to…

| I want to…                                 | Do this                                                                                          |
| :----------------------------------------- | :----------------------------------------------------------------------------------------------- |
| Add or edit a project, the bio, a link     | Edit `db.json`. The shape is enforced by `src/content.config.ts`; a wrong value fails the build. |
| Put a project on the home page             | Set its `featured` to `true`. Three to eight projects fit.                                       |
| Change the order of projects within a year | Reorder them in `db.json`; the site keeps the file's order.                                      |
| Give a project a short link                | Every project with a `live` URL already answers at `/p/<slug>/`.                                 |
| Change a colour, font or spacing           | Read `docs/design.md`, then change the token in `src/styles/global.css`.                         |
| See the site locally                       | `npm run dev`, then open `http://localhost:4321`.                                                |
| Run everything CI runs                     | `npm run validate`                                                                               |
| Check the share images                     | `npm run build`, then look in `dist/og/`.                                                        |

<br />

## 🗂 How it is put together

```text
db.json                    every word of content, validated at build time
src/content.config.ts      collections and schemas over db.json
src/lib/db.ts              typed readers (site, person, links, projects)
src/layouts/Base.astro     <head>: title, description, canonical, Open Graph, JSON-LD, fonts
src/pages/                 index, work/, work/[slug], work/kind/[kind], about, 404
src/pages/og/[id].png.ts   one share image per page, rendered with satori and resvg
src/styles/global.css      design tokens, reset, the few shared classes
docs/product.md            what the site is for and what it will never do
docs/design.md             what the design means and why each token exists
```

Requirements: Node 22.12 or newer (even versions). TypeScript stays on major 6 until `astro check`
supports 7.

<br />

## ✅ Validation

| Command            | Checks                                                                                                         |
| :----------------- | :------------------------------------------------------------------------------------------------------------- |
| `npm run check`    | Types, and `db.json` against the schemas                                                                       |
| `npm run lint`     | ESLint and Prettier                                                                                            |
| `npm test`         | Invariants the schema cannot express: unique slugs, a link per project, a sensible number of featured projects |
| `npm run build`    | The whole site, sitemap, redirects and share images into `dist/`                                               |
| `npm run validate` | All of the above, in that order                                                                                |

CI runs `validate` on every push and pull request, and deploys only when a file the build reads
changed.

<br />

## 🔒 Security and privacy

The site is static HTML and CSS. It sets no cookies, runs no analytics, loads fonts from its own
origin, and makes no request to a third party from the visitor's browser. There are no secrets
and no environment variables; the build succeeds from a clean clone.

<br />

## 🚧 Limitations

- Content is one JSON file by design. See `docs/product.md` for what the site will never do and
  why: no CMS, no translations, no blog, no forms.
- Share images render once at build time in the light colour scheme.
- The custom domain's DNS lives at Hostinger and is managed outside this repository.

<br />

## 📄 License and credits

MIT, see [LICENSE](LICENSE). Type set in [Newsreader](https://github.com/productiontype/Newsreader)
and [IBM Plex](https://github.com/IBM/plex), both under the SIL Open Font License, loaded through
Fontsource.
