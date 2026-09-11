# Contributing

This is a personal site, so outside pull requests are rare and that is fine. Issues are welcome, and
so is a fix for something that is plainly broken.

## Report a bug

Open an [issue](https://github.com/martonpaulo/martonpaulo.github.io/issues) with the page, the
browser and window width, what you expected and what you saw. Layout, contrast, keyboard navigation
and screen-reader problems are real bugs here; accessibility is part of the markup rather than a
pass afterwards.

## Propose a change

Open an issue first. [`docs/product.md`](docs/product.md) says what the site is for and what it will
never do, each non-goal with its reason — if a proposal contradicts one, the answer is already in
that file. [`docs/design.md`](docs/design.md) explains what each design token means; a visual change
that cannot be explained in its terms does not belong. [`AGENTS.md`](AGENTS.md) records the patterns
the code repeats.

Two of them matter for almost any change:

- **Every word a visitor reads lives in `db/`**, including interface copy. A string typed into a
  component is a defect.
- **The schema is the validation.** A new field goes into the zod schema in
  `src/content.config.ts` before it is used.

## Branches, commits and pull requests

- The owner commits directly to `main`. A branch is an occasional convenience; for an outside
  contribution it is the way in.
- Use [Conventional Commits](https://www.conventionalcommits.org/) in English, one commit per
  concern. A commit made for an issue ends with `(#<issue number>)`.
- A pull request is squash-merged; the repository allows no other method.
- Never force-push.

## Run the validation gate

```bash
npm ci
npm run validate
```

That is `check`, `lint`, `test` and `build`, in that order, and it is exactly what CI runs. Run it
before every commit. `npm run format` fixes what Prettier complains about. After a visual change,
look at the affected page in the dev server in light and dark schemes and at a narrow width.

## Code of conduct

Be respectful and assume good faith. Behaviour that makes the project unpleasant for others is not
welcome, whatever its technical merit.
