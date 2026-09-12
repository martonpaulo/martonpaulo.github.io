# martonpaulo.com

## What it is

Marton Paulo's personal website: a static portfolio that shows who he is, what he has built, and
how to reach him, published at <https://martonpaulo.com>.

## Who it is for

Someone who met one of Marton's tools, his GitHub or his LinkedIn and wants to see what else he
has made and who is behind it. Not a hiring funnel: the site shows the work and offers a way to
say hi, and it never pitches Marton as available.

## The job

See Marton's work as he would show it, without digging through LinkedIn's clutter or GitHub's raw
repository list. Today that reader copes with the GitHub profile, which shows every
repository with equal weight, and with LinkedIn, which is generic by design. Neither is curated.

## What it does

- Presents a curated list of projects, each with what it is, what it was built with, when, and
  where to try it or read the code.
- Tells who Marton is in his own voice: bio, current focus, stack, languages spoken, and interests.
- Makes contact one action away: email, LinkedIn and GitHub from every page.
- Is found by search engines and previews well when shared: canonical URLs, titles, descriptions,
  Open Graph and Twitter cards, sitemap, robots, and structured data for a person.
- Loads instantly on any connection and reads well on any screen, from a phone to an ultrawide
  monitor.
- Keeps every word of content in a handful of JSON files under `db/`, so an update is one edit and one push.

## What it will never do

- **Run a backend, CMS, or database.** Directus, Strapi, PostgreSQL on AWS, and Cloudinary were
  all tried and all died or cost money for a site whose content changes a few times a year. The
  content is the `db/` folder in the repository, validated at build time.
- **Translate the copy.** The audience reads English, the owner writes fluently in it, and an
  earlier multilingual version tripled the maintenance of every sentence. Language skills are
  listed as content, not offered as UI.
- **Host a blog.** Writing lives where its readers already are (LinkedIn, Medium). A stale on-site
  blog reads worse than none; `db/` can point to external writing instead.
- **Collect feedback or run forms.** There is no server to receive them. Email is the channel.
- **Set cookies or show a cookie banner.** The site sets none. Analytics, if added later, must be
  cookieless so this stays true.
- **Read as a job application.** No availability line, no CV download, no "open to work". If
  someone wants to hire Marton, the projects make the case and the email is right there.
- **Serve as a playground for the stack.** Every dependency must earn its place through a visible
  benefit to the reader. The site is the product; the code is a quiet demonstration of care.

## How you know it worked

- A first-time visitor can reach a live project or a contact link from the home page in one click.
- Every page scores 100 in Lighthouse performance, accessibility, best practices, and SEO, checked
  at each release on the home and a project page. Baseline: the previous site scored well on
  performance but shipped a React runtime for static content and had no sitemap or structured data.
- Searching the owner's full name returns the site on the first page. Baseline: unknown, the site
  was down at the time of this rewrite.

## Constraints

- Static output only, hosted on GitHub Pages from the `main` branch, at the custom domain
  `martonpaulo.com`. DNS lives at Hostinger and stays owner-managed.
- No secrets, no environment variables, no runtime services: the build must succeed from a clean
  clone with `pnpm install --frozen-lockfile && pnpm build`.
- One content source, the `db/` folder, with a schema enforced at build time. A malformed entry fails the
  build rather than shipping a broken page.
- Accessible by default: WCAG 2.2 AA contrast, keyboard navigation, reduced-motion respected,
  real HTML semantics.
- English product copy. Code, comments, commits, and documentation in English.
