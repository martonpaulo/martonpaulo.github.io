# Project Working Agreements

## Project identity and policy

- Project name: `martonpaulo.com`
- Public name: `martonpaulo.com`
- Benefit-first description: Marton Paulo's personal site: a static portfolio of projects, skills and contact links, built with Astro from a few JSON files and published to GitHub Pages at martonpaulo.com.
- Repository: `martonpaulo/martonpaulo.github.io` (public)
- Public identifiers: the domain `www.martonpaulo.com`. The npm package name is private and never published.
- Landing page: the site itself, canonical URL `https://www.martonpaulo.com`, served by GitHub Pages from this repository's `Validate and deploy` workflow. DNS lives at Hostinger and is owner-managed; nothing in this repository touches it.
- License: `MIT`
- Copyright: 2025 Marton Paulo
- Development language: English.
- Product copy: English only, no localization. Language skills are content in `db/person.json`, not a UI feature; the reason is recorded in `docs/product.md`.
- Branch policy: `main`-only. Work is committed directly to `main`; a branch is an occasional convenience for an experiment, never a requirement, and no pull request is needed to deliver.
- Commit policy: automatic. When a task's validation passes, the agent commits its result as one Conventional Commit per concern without being asked.
- Push policy: automatic. After committing, the agent pushes `main` to `origin`, which runs the deploy workflow. A failed validation is never pushed.
- Product versioning: unversioned. The site has no user-visible version and no releases; `version` in `package.json` stays `0.0.0` and is not a product version. Every push to `main` that changes a build input deploys.
- Agent automation: `disabled`
- Merge policy: pull requests are the exception. When one is used, it is squash-merged with `gh pr merge <number> --squash --delete-branch`, and the repository allows no other method.
- Commit subject: a commit made for an issue ends with `(#<issue number>)`.
- Delete branches after merge: enabled.
- Release, signing, and secret-storage policy: Not applicable. There is no distribution beyond the website, no secret, no environment variable, and no signing; the build must succeed from a clean clone with `npm ci && npm run build`.
- Browser engine families: Chromium, Gecko and WebKit are all acceptance targets. Validation is by the checks below plus a manual look in one browser of each family when a visual change lands; there is no browser automation.
- Skills baseline revision: `7cfc324fcded57145c36cc678977c070ed800692`
- Skills baseline applied: `2026-09-08`
- Skills baseline divergence `merge-policy` at `7cfc324fcded57145c36cc678977c070ed800692`: the `AGENTS.md` template still prescribes merge commits, while `skd-github-publishing-conventions` changed the collection default to squash on 2026-09-03; this repository follows the conventions.

Treat these values as stable project decisions. Change an established identifier, license, visibility, branch policy, versioning model, localization strategy, landing-page contract, agent-automation decision, or release policy only through an explicit task that describes the migration and downstream effects.

## What the site is

`docs/product.md` says what the site is for, who reads it, and what it will never do, each non-goal
with its reason. Read it before proposing a feature; if the feature contradicts a non-goal, the
answer is in that file, not in this one.

## Agent skill paths

- Product definition: `docs/product.md`
- Design rationale: `docs/design.md`
- Domain glossary: `CONTEXT.md` (optional; create only when useful)
- ADRs: `docs/adr/` (create only with the first decision record)
- Research notes: `docs/research/` (create only when persisting research)
- Handoffs: `.scratch/handoffs/` (ignored by Git)
- Prototypes: `.scratch/prototypes/` (ignored by Git)

## Commands

| Command            | What it does                                                                                  |
| :----------------- | :-------------------------------------------------------------------------------------------- |
| `npm run dev`      | Astro dev server at `http://localhost:4321`                                                   |
| `npm run check`    | `astro check`: type-checks `.astro` and `.ts`, validates every `db/*.json` against its schema |
| `npm run lint`     | ESLint, then Prettier in check mode                                                           |
| `npm run format`   | Prettier in write mode                                                                        |
| `npm test`         | Node's test runner over `tests/`: invariants in `db/` the schema cannot express               |
| `npm run build`    | Static build into `dist/`, including sitemap, share images and redirects                      |
| `npm run validate` | `check`, `lint`, `test`, `build`, in that order; what CI runs                                 |
| `npm run preview`  | Serves `dist/` locally                                                                        |

Node 22.12 or newer, even versions only. TypeScript stays on major 6 until `astro check` supports
TypeScript 7; do not bump it to make the lockfile look current. Styles are Sass (`.scss`) only for
the breakpoint mixin and nesting; tokens stay CSS custom properties.

## Patterns this project repeats

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
- **Visual decisions are tokens.** `docs/design.md` explains them; `src/styles/tokens.scss` holds
  them as CSS custom properties; components use only the variables. Sizes use `rem` on a doubling
  scale (`--space-1` … `--space-6`). Breakpoints are the one Sass mixin, in
  `src/styles/_breakpoints.scss`, so no width is repeated by hand. No utility framework, no inline
  colours, no magic numbers.
- **Shared utilities before new rules.** `.container`, `.stack-center`, `.actions`, `.lede`,
  `.prose`, `.section` and `.visually-hidden` in `src/styles/utilities.scss` cover the layouts
  every page repeats. A component reaches for them first.
- **Accessibility is part of the markup, not a pass afterwards.** Landmarks and skip link in the
  layout, `aria-current` on the active navigation and filter, one link per card with the project
  name as its accessible name and decorative images with empty `alt`, headings in order with hidden
  ones where a section has no visible title, every control at least `--touch-target` tall, a
  visible focus ring in `--focus`, and every animation off under `prefers-reduced-motion`.
- **Responsive by measure, not by device.** Fluid type through `clamp()`, one card column on
  phones, two from `tablet`, four on `ultrawide`; the container widens on ultrawide instead of
  stretching the cards.
- **One script, and it is Astro's.** The only client JavaScript is Astro's `<ClientRouter />`,
  there because the background light must keep drifting across navigations (`transition:persist`
  on `.page-glow`) instead of restarting on every page. Nothing else ships a script; a feature that
  needs one must say what it does that HTML and CSS cannot.
- **SEO is owned by the layout.** `src/layouts/Base.astro` emits title, description, canonical,
  Open Graph, Twitter, JSON-LD (built in `src/lib/seo.ts`) and font preloads. A page passes
  `description`, an `ogImage` path from `shareImageFor()` and optional extra JSON-LD; it never
  writes `<head>` tags.
- **Share images are generated, never drawn by hand.** `src/pages/og/[id].png.ts` renders one PNG
  per page from the same content with satori and resvg. A new page that deserves its own card adds
  an entry there.
- **Project artwork is a real capture.** `src/assets/projects/<slug>.png` is a transparent PNG of
  the product's own interface cut into a rounded panel, or its app icon when there is no interface
  to capture. It is referenced from the project's `image` field in `db/projects.json` with an `alt` and a
  `fit`, and rendered through `<Image>` with the widths in `src/lib/images.ts`.
- **Static output, trailing slashes.** `trailingSlash: "always"` matches how GitHub Pages serves
  `directory` builds. Internal links end with `/`.
- **Redirects come from data.** `/p/<slug>` sends a visitor to a project's live URL; the list is
  derived from `db/projects.json` in `astro.config.ts` and excluded from the sitemap and `robots.txt`.
  Sibling projects deployed from other repositories are served by GitHub under
  `www.martonpaulo.com/<repo>/`, so their `live` links point there.

## Instruction hierarchy and sources of truth

- Follow the direct task, the most specific applicable scoped instructions, this root file, and then general working agreements, in that order.
- Read applicable instructions before changing files.
- Code is evidence of current behavior. `AGENTS.md` is normative for process. `docs/product.md` is normative for what belongs in the product. Expose divergence among them; do not silently resolve every conflict in favor of one source.
- Keep one canonical source for each rule. Secondary documents should summarize or link to it instead of restating it.
- Do not turn analysis, research, or a read-only audit into implementation without authorization.
- Be direct and evidence-based. State assumptions, uncertainty, risks, tradeoffs, and blockers.
- Ask only when a material decision cannot be discovered safely. Prefer explicit, reversible assumptions when enough context exists.
- Give concise progress updates during long-running work.

## Long-running operations

For any command, process, browser action, integration, or delegated task likely to run long:

- Use the client's bounded yield, timeout, or status mechanism and wait for an observable
  condition instead of an arbitrary sleep.
- Keep the user informed at least once per minute when the client supports progress commentary.
- Distinguish slow but progressing work from a stall using new output, state changes, resource
  activity, the known duration of the current phase, or a tool-reported deadline. Elapsed time
  alone is not evidence of a stall.
- Inspect the current output and state before interrupting, retrying, or changing approach.
- Interrupt only when there is evidence of no useful progress, a deadline has expired, or the
  continued cost or risk is no longer justified.
- After an interruption, explain what state or output was preserved, diagnose the likely cause,
  and choose a narrower retry, a different tool, a smaller unit of work, or an explicit blocker.
- Never rerun the same unchanged failure, and do not add a polling service, background job, timer,
  or other infrastructure merely to satisfy this rule.
- Keep termination thresholds task-specific. Workflow-specific wait tools and user-input
  boundaries remain authoritative.

## Before editing

1. Check applicable instructions, Git status, and the current branch.
2. Search for the behavior, callers, tests, contracts, and nearby patterns before adding anything.
3. Read only the files and chunks required to understand the affected behavior.
4. Distinguish verified facts, reasonable inferences, and unknowns.
5. Define the source of truth and ownership before changing data or state.
6. Make a short plan only for complex, risky, ambiguous, or multi-file work.

## Scope, reuse, and implementation

- Keep changes scoped to the requested result. Do not mix unrelated cleanup, redesign, dependency updates, broad refactors, or future work.
- Preserve behavior outside the task and preserve unrelated or uncommitted user changes.
- Search for existing components, services, types, helpers, tokens, configuration, tests, and platform capabilities before creating new ones.
- Follow the patterns this project already repeats. When a change would break a recorded pattern or establish a new one, stop and ask first, naming the existing pattern, the proposed one, and why the existing one does not fit. Deviating is allowed; deviating silently is not.
- Prefer the smallest correct, readable, reversible, and low-operational-cost solution.
- Maintain one owner and one source of truth for each business rule, state, mapping, default, and copy value.
- Derive values instead of storing synchronized copies. Model invalid states explicitly.
- Do not add dependencies, services, layers, caches, observers, timers, polling, background jobs, or infrastructure without a current requirement and a clear owner. Every dependency must earn its place through a visible benefit to the reader.
- For large changes, use reviewable, executable increments and patches small enough to diagnose failures. Do not fragment one coherent concern mechanically.
- Implement relevant errors, states, accessibility, and tests with the behavior rather than as unrelated follow-up work.

## Data, security, and destructive operations

- The `db/` folder is canonical data and the only durable state. `dist/`, `.astro/` and
  `node_modules/.astro/fonts` are reconstructible and never committed.
- Keep credentials, tokens, private keys, personal data beyond what the site publishes on purpose,
  and sensitive payloads out of the repository and logs. The site needs none of them; a change that
  introduces one is a design question, not a configuration step.
- Use structured subprocess arguments and validate destinations, redirects, and untrusted inputs.
- Resolve an exact target before deletion, overwrite, interruption, or another hard-to-recover action. A clear request authorizes its exact resolved operation; ask again when the target is ambiguous, loss is difficult to recover, or effects exceed the named scope.
- Prefer recoverable deletion where practical. Never force-push or perform broad cleanup without explicit authorization.

## Product interface and accessibility

- Read `docs/design.md` before any visual change. It says what the site is meant to signify and
  why each token exists; a change that cannot be explained in its terms does not belong. The
  visual reference is seanhalpin.xyz; the owner's taste is minimal, personal and never template-like.
- Prefer native HTML and established patterns. Custom UI must provide clear product value.
- Define layout, hierarchy, controls, loading, content, empty, error, retry, disabled, cancellation, and destructive states when applicable.
- Include keyboard navigation, focus, screen-reader labels, scalable text, contrast, safe areas, reduced motion, and non-color status cues in the same change. `--text-muted` is the lightest text allowed on `--bg` and `--tile-ink-muted` on a tile; check contrast before adding a lighter one.
- Keep visible copy in `db/copy.json` and consistent with the product language strategy.
- Keep expensive work out of the build's hot paths: share images are the slowest step and are generated once per page.
- Measure before claiming a performance problem and optimize measured user-visible bottlenecks. The target is 100 in every Lighthouse category on the home page and a project page.

## Code, comments, and documentation

- Write code, comments, commits, filenames, tests, configuration, and developer documentation in English. Product copy follows the recorded localization strategy.
- Follow the existing formatter, linter, naming, file layout, and architectural conventions.
- Prefer clear types, explicit ownership, and simple control flow over cleverness.
- Put comments next to non-obvious constraints. Explain intent, provenance, or a subtle external rule, not mechanics.
- Link official documentation in a code comment when an external rule or workaround must remain visible to prevent a future regression.
- Durable documentation describes responsibilities, contracts, invariants, commands, and decisions. Audits cite exact evidence. Manuals use exact filenames only when users must act on them and the names are stable contracts.
- Update the smallest canonical documentation section when a durable contract changes. Do not create empty documentation for possible future use.
- Keep the README easy to scan. Cover benefit, behavior, requirements, setup, usage, validation, security, privacy, limitations, landing page, and download where applicable.
- When creating a README or materially updating one, use the recorded `Public name` above as the H1
  and preserve an existing approved H1, including its branding and casing. Humanize the raw
  repository slug only when the public name is unresolved; never mechanically title-case an
  approved name or sweep unrelated README content.
- Every fenced code block you create or materially edit has an explicit language identifier. Use
  the real language for code or configuration and `text` for plain commands or output; leave
  untouched historical fences alone.
- Use badges, real screenshots, statistics, and emoji only when they improve comprehension and can
  remain current. No README needs a visual aid to pass setup.
- Preserve third-party licenses, copyright, attribution, and notices. The fonts are loaded from
  Fontsource under the SIL Open Font License and are not vendored, so no notice file is needed;
  vendoring one would create that obligation.

## Durable project learning

At workflow wrap-up, assess whether the work produced a learning that should outlive the current
session. A learning qualifies only when it is verified, specific to this project, likely to recur,
and belongs in a durable source.

Qualifying examples include:

- reproducible build, test, setup, or recovery commands that were actually run;
- an ownership boundary or invariant established by code and accepted guidance;
- a recurring failure shield with a verified cause; or
- a versioned external constraint whose source must remain visible.

Hypotheses, one-off debugging steps, raw logs, issue-specific implementation details, transient
environment state, machine-specific paths, credentials, personal data, and model conclusions
without evidence do not qualify.

Compare each qualifying learning with the existing canonical guidance, README, scripts, and
architecture records. If the learning is already recorded, do nothing. If it is absent or
contradictory, present one compact proposal that names the evidence, the canonical owner, the exact
section or script, and the smallest intended change. Use the shared proposal fields `Evidence`,
`Canonical owner`, `Smallest change`, `Draft`, and `Decision requested`. The draft is the exact
section or script change being proposed; end with `Decision requested: Approve, reject, or revise.`
Do not create a new file when an existing owner can hold the learning, and do not turn a convenience
into a mandatory convention.

Documentation required by the selected behavior remains part of the current task and needs no
additional approval. An adjacent learning outside the accepted scope is proposal-only and waits for
explicit owner approval before editing, staging, or committing. Behavior-changing configuration or
script work is a separate approved task and never enters through the documentation gate. Do not
delay the requested task result while waiting on an adjacent proposal, and do not publish the
proposal externally on your own.

## User attention cards

When the user must notice and respond to a proposed follow-up, a material choice, a permission
boundary, or a blocker, use exactly one of the four attention cards below. Never hide one inside a
general summary, ordinary bullet list, or vague "human review" note.

The English labels in the templates name the semantic fields; they are not fixed user-facing copy.
Render every visible heading, field label, explanation, option, recommendation, and reply token in
the language already used with the user. If the user changes language explicitly, follow the latest
choice. Keep code, commands, paths, identifiers, and quoted source text in their required form.

Surround every card with a Markdown horizontal rule: a standalone `---` before its heading and
another after its final response line. When cards are consecutive, one rule may separate them. The
emoji supplements the descriptive heading and never replaces it. Use one card per requested
decision, approval, action, or issue proposal, and end with an exact response format the user can
copy.

### Raise the card through the question tool

A card written only as Markdown is a message, and a message ends the turn. The agent stops, the
orchestrator marks the session idle, and a decision that was genuinely blocking looks answered.
The card is the record; it is not the asking.

So whenever the client offers a native structured-question facility — `AskUserQuestion` in Claude
Code, the equivalent elicitation or form input in other agents — put the question through it. The
tool call is what actually holds the turn open, and it is what makes an orchestrated session
report **Blocked** rather than looking finished. Map the card onto it directly: the card's heading becomes the question, each row of the
options table becomes one option with its tradeoffs as the description, and the recommended option
goes first, marked as recommended.

Write the card too, in the same turn. The tool renders a compact chooser, while the card carries
the evidence, the impact and the reasoning that the chooser has no room for. One without the other
loses something: the tool alone strips the argument, the card alone never asks.

Fall back to the card alone only when the client has no such facility. A run that wrote only the
card has not asked, however clearly it was worded.

### Proposed issue

Use this card when the work uncovers a distinct, evidence-backed, implementable improvement outside
the accepted scope that is valuable enough to preserve and is not already tracked. A durable
research note or other repository artifact does not replace this visible proposal. Do not propose
issues for incidental observations, speculative ideas without enough evidence, already tracked
work, or changes completed within the current task. The card proposes backlog capture; it never
authorizes creating or publishing the issue.

```markdown
---

## 🆕 Proposed issue: <short title>

**What I need from you:** Approve, reject, or revise this issue proposal.

### Why this matters

<Explain the user or project impact in plain language.>

### Current situation

<Explain what happens today and the evidence found.>

### Proposed outcome

<Explain what should become possible or improve after implementation.>

### Why this is a separate issue

<Explain why it is valuable but outside the current task.>

### My recommendation

<Explain briefly why opening the issue is worthwhile.>

**Reply with:** `Approve issue`, `Reject issue`, or `Revise: ...`

---
```

### Decision needed

Use this card when the user must choose among materially different outcomes. State why the choice
cannot be made safely from existing evidence, show the meaningful options and tradeoffs, and make a
clear recommendation. Do not stop at "human review needed."

```markdown
---

## 🧭 Decision needed: <question>

**What I need from you:** Choose one of the options below.

### Why this decision is needed

<Explain what cannot be decided safely without the user's preference.>

### Options

| Option | What it means | Advantages | Disadvantages |
| --- | --- | --- | --- |
| A — <name> | <plain explanation> | <benefits> | <tradeoffs> |
| B — <name> | <plain explanation> | <benefits> | <tradeoffs> |

### My recommendation

**Option <X>**, because <short evidence-based reason>.

**Reply with:** `Option A`, `Option B`, or `Revise: ...`

---
```

### Approval needed

Use this card when one exact action is already preferred but crossing a permission, publication,
destructive-operation, cost, privacy, or external-mutation boundary requires approval. Name the
exact target, expected change, risk, reversibility, and recovery path. Approval covers only the
stated action.

```markdown
---

## 🔐 Approval needed: <exact action>

**What I need from you:** Approve or decline this specific action.

### Proposed action

<Describe exactly what will be changed, published, deleted, or executed.>

### Why it is needed

<Explain the benefit and why the action cannot be avoided.>

### Impact and safety

- **Target:** <exact repository, file, branch, service, or data>
- **Expected change:** <what will be different>
- **Risk:** <what could go wrong>
- **Reversible:** <yes or no, and how>
- **Recovery:** <how the previous state can be restored>

### My recommendation

<Recommend approval or rejection, with a short reason.>

**Reply with:** `Approve`, `Decline`, or `Revise: ...`

---
```

### Action needed

Use this card when work is blocked by one specific external action from the user rather than by a
choice or permission decision. State what is blocked, why the agent cannot continue, the smallest
unblocking action, and the observable condition for resumption.

```markdown
---

## ⛔ Action needed: <blocking condition>

**What I need from you:** <one specific action>.

### What is blocked

<Explain which requested work cannot continue.>

### Why I cannot continue

<Explain the verified blocker in plain language.>

### How to unblock it

1. <First exact action>
2. <Second action, only when necessary>

### I can continue when

<Describe the observable condition that confirms the blocker is resolved.>

---
```

## Configuration and repository hygiene

- Ignore secrets, local environments, logs, caches, build output, and generated artifacts appropriate to the actual stack. `.gitignore` covers `node_modules/`, `dist/`, `.astro/`, `.env*` and `.claude/`.
- There are no local environment variables, so there is no `.env.example`. Add one only with the first real variable.
- Dependency updates are manual: run `npm outdated`, update, run `npm run validate`, commit. Keep TypeScript on major 6 (see Commands).
- Change GitHub's repository `homepage` to the recorded canonical landing-page URL only when the
  Pages site exists, the latest `github-pages` deployment succeeded, and both GitHub URL surfaces
  agree with that recorded URL. When the value differs, preview and confirm the exact change, then
  read `homepage` back through the API. Otherwise leave it unchanged and report the evidence gap;
  do not enable or deploy Pages as setup work.
- Keep secrets in the platform or provider's secure store, never in versioned files.

## Tests and validation

- `npm run validate` is the gate before every commit. It is what CI runs on every push and pull request; the deploy job runs only after it passes and only when a build input changed.
- Add a Node test in `tests/` for an invariant of `db/` the schema cannot express. Do not test framework behavior or mirror the schema.
- Run the smallest relevant check during iteration (`npm run check` for content and types, `npm test` for data). Inspect the first useful failure and make a relevant change before rerunning it.
- After a visual change, look at the affected page in the dev server in light and dark schemes and at a narrow width before committing.
- Never claim a check passed unless it ran successfully. Report exact skips, blockers, residual risk, and manual gaps.

## Artifacts and processes

- Temporary is the default; retention is an explicit repository exception.
- Remove only temporary files created by the current task when they are no longer needed. Preserve deliverables, next-phase inputs, failure evidence, and anything protected by repository policy.
- Never delete pre-existing user artifacts, fixtures, baselines, or logs merely because they look temporary.
- Never version `dist/`, `.astro/`, caches, local logs or coverage.
- Stop servers, watchers, browsers, and other processes started by the task. Do not stop the user's pre-existing processes.

## Git and releases

- Follow the recorded branch, commit, push, and version policies above.
- Check status and branch before editing and before the final report. Work only on task files and leave unrelated changes untouched.
- Use Conventional Commits in English. Make one commit per concern: a small task usually has one; a large task may have several independent concerns. Do not split mechanically or combine unrelated changes.
- End a commit subject with its issue number when the commit belongs to one: `feat: add the export button (#54)`. Use the issue number, never the pull request's, and leave the suffix off when there is no issue.
- Inspect the exact payload before publishing it: the staged diff before a commit, the outgoing
  commit range before a push, the final text before an issue, pull request, comment, or review.
  Never commit secrets, caches, generated logs, temporary artifacts, or unrelated formatting churn.
- Stop before the mutation when the payload holds a credential, token, key, signing material, or
  sensitive personal value. Report the file, a masked location, and the category; never print the
  value. Offer a placeholder, a secret-store reference, or removal from scope. An explicit request
  to publish a plaintext secret is refused: authorization can permit a publication, it cannot make
  a secret safe.
- If a value may already be published, deleting it from the latest tree does not unpublish it. Stop
  further spread, state the reach without repeating the value, and revoke or rotate it before any
  decision about rewriting history.
- Never force-push. If commit or push fails, report the exact failure without claiming success.
- There are no releases and no version bumps. Do not tag, do not change `version`, do not write a changelog.

## Completion report

Lead with the outcome and include:

- what changed and why;
- files touched;
- validation commands and actual results;
- warnings, failures, skips, manual gaps, and remaining risks;
- temporary artifacts kept or removed;
- commit and push status;
- final worktree status and unrelated dirty files left untouched.
