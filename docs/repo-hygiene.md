# Repo hygiene

A README goes stale quietly. The description still describes last year's idea, the Stack section
never heard about the framework I switched to, the live link 404s. This check reads a repo's public
face and compares it against what is actually in the repo.

The checker is [`tools/repo-hygiene.mjs`](../tools/repo-hygiene.mjs). It has no dependencies and
runs on Node 22.

## What it checks

| Check | Fails when |
|---|---|
| `description` | The GitHub description and the README's opening line have drifted apart, or the description is empty |
| `topics` | Fewer than three topics |
| `homepage` | The README links a deployed site (Pages, Cloudflare, Azure, Vercel, Netlify) but the repo has no homepage set |
| `title` | The H1 is the lowercase repo slug instead of the project's name |
| `stack` | A notable dependency in `package.json` or a `.csproj` is never named in the README |
| `version` | The manifest version is behind the latest release, or the README quotes an older version as current |
| `links` | A relative link points at a file that isn't there, or an external link returns an error |

`stack` only looks at dependencies worth naming — frameworks, build tools, test runners, ORMs. The
list is `NOTABLE` at the top of the checker; add to it when something belongs in a README.

## Running it

```bash
# One repo, from its checkout
node tools/repo-hygiene.mjs --repo malinfossum/spindle --path ../spindle

# Every repo I own, archived included. --owner takes a list, for my orgs.
GITHUB_TOKEN=$(gh auth token) node tools/repo-hygiene.mjs --all --owner malinfossum,rookdex,wendhq --include-archived
```

`--mode strict` exits 1 on findings; the default `warn` reports and exits 0.

## Wiring a repo into it

Drop this in `.github/workflows/repo-hygiene.yml`. It is already in every scaffold, so new projects
start with it.

```yaml
name: Repo hygiene

on:
  push:
    branches: [main]
    paths: ["README.md"]
  pull_request:
    paths: ["README.md"]
  release:
    types: [published]
  workflow_dispatch:

jobs:
  hygiene:
    uses: malinfossum/workbench/.github/workflows/repo-hygiene.yml@main
    with:
      mode: ${{ (github.event_name == 'push' || github.event_name == 'pull_request') && 'warn' || 'strict' }}
```

Touching a README warns; a release fails the run. **GitHub has no pre-release hook** — `release:
published` fires the moment the release goes live, not before it. To gate a release properly, run
the check by hand (`workflow_dispatch`, or the command above) before cutting the tag; the automatic
run is the net that catches what I forget.

Org `.github` repos are skipped: their README lives at `profile/README.md` and describes the org,
not the repo.

## Archived repos

Archived repos are read-only: their topics, description and files cannot change until they are
unarchived. The weekly audit reports them in a collapsed section and never fails on them.
