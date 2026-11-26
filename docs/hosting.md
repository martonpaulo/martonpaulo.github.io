# Hosting and settled settings

How the site reaches visitors, and the GitHub settings that look wrong but are settled. `AGENTS.md`
sends an agent here before it edits `.github/`.

## Contents

- [The domain and the proxy](#the-domain-and-the-proxy)
- [Workflows](#workflows)
- [Settled settings](#settled-settings)

## The domain and the proxy

- The canonical URL is `https://martonpaulo.com`, served by GitHub Pages from the `Deploy`
  workflow. The domain is registered at Hostinger and its DNS is delegated to Cloudflare
  nameservers; both are owner-managed and nothing in this repository touches them.
- HTTPS is terminated by the Cloudflare proxy in front of GitHub Pages, so
  `http://martonpaulo.com/` already answers `301` to the HTTPS canonical.
- Because the apex `A` records resolve to Cloudflare rather than to the GitHub Pages addresses,
  GitHub cannot issue its own certificate: `PUT /repos/martonpaulo/martonpaulo.github.io/pages`
  with `https_enforced: true` fails with `404 The certificate does not exist yet`, and the Pages
  metadata keeps `https_enforced: false` and an `http://` `html_url`. That mismatch is expected and
  is not a defect to fix from this repository.
- It affects no visitor only while Cloudflare can accept the origin's `*.github.io` certificate for
  the apex: under Full (strict) every uncached path answers `526`
  ([#40](https://github.com/martonpaulo/martonpaulo.github.io/issues/40)), because a strict origin
  check matches the requested or target hostname and the apex's target is an IP.
- Since 2026-09-09 each sibling project is served on its own subdomain
  (`https://<product>.martonpaulo.com/`, one GitHub Pages custom domain per repository).

## Workflows

- `Validate` runs `check`, `lint`, `test` and the repository text checks on every push and pull
  request.
- `Deploy` runs only after `Validate` succeeds on `main`, never repeating those checks, and
  publishes on every such run, plus the weekly schedule that keeps the bio's `{years}` and the
  footer year current. It writes the deployed commit to `/build.txt` and its last step reads the
  live site back with `scripts/live_build_check.py`.
- `Live` requests uncached paths after each deploy and daily, and fails on any non-2xx answer: the
  proxy's settings change without a commit, and a cached page hides a refused origin.

## Settled settings

- `homepage` is `https://martonpaulo.com` while the Pages API's `html_url` is
  `http://martonpaulo.com/`, for the certificate reason above. That is the settled state;
  `homepage` is already correct, so do not "fix" either value and do not reopen it as a finding.
- The Dependabot tab (`/network/updates`) answers `404` because `dependabot_security_updates` is
  disabled, which is what manual dependency updates mean. The dependency graph itself is enabled
  and populated: `/network/dependencies` and the SBOM API both answer `200`. A `404` on the
  updates tab is not a broken dependency viewer.
